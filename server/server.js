const express = require('express');
const cors = require('cors');
const { spawn } = require('child_process');
const bodyParser = require('body-parser');
const path = require('path');
const app = express();
const PORT = process.env.PORT || 5000;
const fs = require('fs');
const SERVER_URL = process.env.SERVER_URL || `http://localhost:${PORT}`;
console.log('Server URL:', SERVER_URL);
process.env.SERVER_URL = SERVER_URL;
const clientBuildPath = path.join(__dirname, '..', 'client', 'build');
console.log('Client build path:', clientBuildPath);

// app.use(express.static(path.join(__dirname, '../client/build')));

app.use(cors({
  origin: ['http://localhost:3000', 'http://127.0.0.1:3000', 'http://localhost:5000', 'http://127.0.0.1:5000'],
  methods: ['GET', 'POST', 'OPTIONS', 'PUT', 'DELETE'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  credentials: false
}));

// Middleware

app.options('*', cors());
app.use(bodyParser.json({ limit: '50mb' }));
app.use(bodyParser.urlencoded({ extended: true, limit: '50mb' }));

const chatRoutes = require('./routes/chatRoutes');
const telegramRoutes = require('./routes/telegram');
app.use('/api/telegram', telegramRoutes);
app.use('/api', chatRoutes);
if (fs.existsSync(clientBuildPath)) {
  console.log('Serving static files from:', clientBuildPath);
  app.use(express.static(clientBuildPath));
  
  // Only add the catch-all route if we're serving static files
  app.get('*', (req, res) => {
    const indexPath = path.join(clientBuildPath, 'index.html');
    if (fs.existsSync(indexPath)) {
      res.sendFile(indexPath);
    } else {
      res.status(404).send('Not found - index.html is missing');
    }
  });
} else {
  console.log('Client build directory not found at:', clientBuildPath);
  
  // Add a simple route for the root path
  app.get('/', (req, res) => {
    res.send('API server is running. Use /api endpoints to access the API.');
  });
}

// Endpoint to handle scraping requests
app.post('/api/scrape', async (req, res) => {
  try {
    const { type, urls } = req.body;
    
    console.log(`Received scrape request for type: ${type}, URLs:`, urls);
    
    if (!urls || urls.length === 0) {
      return res.status(400).json({ error: 'No URLs provided' });
    }

    // Define fields to extract based on the type
    let fields;
    switch (type) {
      case 'products':
        fields = 'name,description,price,imageUrl,availability,category';
        break;
      case 'contact':
        fields = 'email,phone,address,hours,socialMedia';
        break;
      case 'about':
        fields = 'companyName,history,mission,team,values';
        break;
      case 'faq':
        fields = 'question,answer,category';
        break;
      case 'policies':
        fields = 'title,content,lastUpdated';
        break;
      default:
        fields = 'content';
    }

    console.log(`Processing URLs with fields: ${fields}`);

    // Process each URL and collect results
    const results = await Promise.all(
      urls.map(async (url) => {
        try {
          return await scrapeUrl(url, fields, type);
        } catch (error) {
          console.error(`Error scraping URL ${url}:`, error);
          return { url, error: error.message, data: [] };
        }
      })
    );

    console.log('Scraping results:', results);

    // Check if all results failed
    const allFailed = results.every(result => result.error);
    if (allFailed) {
      return res.status(500).json({ 
        error: 'Failed to scrape any data', 
        details: results.map(r => r.error).join('; ')
      });
    }

    // Format the results based on the type
    let formattedResults;
    if (type === 'about' || type === 'contact') {
      // For about and contact pages, combine all data into a single object
      formattedResults = results.reduce((acc, result) => {
        if (result && result.data && !result.error) {
          // Handle both array and object formats
          const data = Array.isArray(result.data) ? result.data[0] : result.data;
          return { ...acc, ...data };
        }
        return acc;
      }, {});
    } else {
      // For products, FAQ, and policies, concatenate all items
      formattedResults = results.reduce((acc, result) => {
        if (result && result.data && !result.error) {
          // Ensure data is an array
          const dataArray = Array.isArray(result.data) ? result.data : [result.data];
          return [...acc, ...dataArray];
        }
        return acc;
      }, []);
    }

    console.log('Formatted results:', formattedResults);
    res.json(formattedResults);
  } catch (error) {
    console.error('Error processing scrape request:', error);
    res.status(500).json({ 
      error: 'Failed to scrape data', 
      details: error.message,
      stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
    });
  }
});

function scrapeUrl(url, fields, type) {
    return new Promise((resolve, reject) => {
        console.log(`Attempting to scrape URL: ${url} with fields: ${fields} and type: ${type}`);
        
        const scriptPath = path.resolve(__dirname, '..', 'python', 'scraper.py');
        console.log(`Python script path: ${scriptPath}`);
        
        const fs = require('fs');
        if (!fs.existsSync(scriptPath)) {
            console.error(`Python script not found at: ${scriptPath}`);
            return reject(new Error(`Python script not found at: ${scriptPath}`));
        }
        
        const pythonProcess = spawn('python', [
            scriptPath,
            url, 
            fields, 
            type
        ], {
            env: {
                ...process.env,
                GEMINI_API_KEY:'AIzaSyDmTQWxYav1L1My6Fz-VxXLSTCA5lR0La8'
            }
        });
        
        let dataString = '';
        let errorString = '';
    
        pythonProcess.stdout.on('data', (data) => {
            dataString += data.toString();
        });
    
        pythonProcess.stderr.on('data', (data) => {
            errorString += data.toString();
            console.error(`Python stderr: ${data.toString()}`);
        });
    
        pythonProcess.on('close', (code) => {
            if (code !== 0) {
                console.error(`Python process failed with exit code ${code}`);
                console.error(`Error output: ${errorString}`);
                return reject(new Error(`Python process failed with exit code ${code}: ${errorString}`));
            }
        
            try {
                // Extract JSON from the output
                const jsonStart = dataString.indexOf('{');
                const jsonEnd = dataString.lastIndexOf('}') + 1;
                if (jsonStart === -1 || jsonEnd === -1) {
                    throw new Error('No valid JSON found in the output');
                }
        
                const jsonString = dataString.substring(jsonStart, jsonEnd);
                const jsonData = JSON.parse(jsonString);
                return resolve(jsonData);
            } catch (error) {
                console.error('Failed to parse script output:', error);
                console.error('Raw output:', dataString);
                return reject(new Error(`Failed to parse script output: ${error.message}`));
            }
        });
    });
}

// Catch-all handler for React app
// app.get('*', (req, res) => {
//   res.sendFile(path.join(__dirname, 'client/build', 'index.html'));
// });
app.get('*', (req, res) => {
  // Check if the file exists before trying to serve it
  const indexPath = path.join(__dirname, '../client/build/index.html');
  const fs = require('fs');
  
  if (fs.existsSync(indexPath)) {
    res.sendFile(indexPath);
  } else {
    // If the file doesn't exist, send a 404 response
    res.status(404).send('Not found - Make sure you have built your React app');
  }
});

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
  console.log(`API endpoints available at http://localhost:${PORT}/api/`);
});