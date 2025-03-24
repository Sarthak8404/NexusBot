const express = require('express');
const { spawn } = require('child_process');
const router = express.Router();
const path = require('path');

// API endpoint for chat
// API endpoint for chat
// API endpoint for chat
// API endpoint for chat
router.post('/chat', async (req, res) => {
  try {
    const { query, websiteData } = req.body;
    
    if (!query || !websiteData) {
      return res.status(400).json({ error: 'Missing query or website data' });
    }

    console.log('Received chat query:', query);
    console.log('Website data keys:', Object.keys(websiteData));
    
    // Prepare the data for the Python script
    const pythonScriptPath = path.join(__dirname, '..', '..', 'python', 'chat_processor.py');
    console.log('Python script path:', pythonScriptPath);
    
    // Check if the Python script exists
    const fs = require('fs');
    if (!fs.existsSync(pythonScriptPath)) {
      console.error('Python script not found at:', pythonScriptPath);
      return res.status(500).json({ 
        error: 'Python script not found',
        response: "I'm sorry, I couldn't access my knowledge base at the moment."
      });
    }
    
    // Use python3 explicitly and pass the query and data as a single JSON string
    const pythonProcess = spawn('python', [
      pythonScriptPath,
      JSON.stringify({
        query: query,
        websiteData: websiteData
      })
    ], {
      env: {
        ...process.env,
        GEMINI_API_KEY: 'AIzaSyDmTQWxYav1L1My6Fz-VxXLSTCA5lR0La8'
      }
    });

    let responseData = '';
    let errorData = '';

    // Collect data from stdout
    pythonProcess.stdout.on('data', (data) => {
      responseData += data.toString();
      console.log('Python stdout chunk:', data.toString());
    });

    // Collect error data from stderr
    pythonProcess.stderr.on('data', (data) => {
      errorData += data.toString();
      console.error(`Python stderr: ${data}`);
    });

    // Handle process completion
    pythonProcess.on('close', (code) => {
      console.log(`Python process exited with code ${code}`);
      console.log('Final response data:', responseData);
      console.log('Error data:', errorData);
      
      if (code !== 0) {
        console.error(`Error: ${errorData}`);
        return res.status(500).json({ 
          error: 'Error processing chat query',
          details: errorData,
          response: "I'm sorry, I encountered an error while processing your request."
        });
      }

      // If we have response data, try to parse it
      if (responseData.trim()) {
        try {
          // Try to parse the response as JSON
          const parsedResponse = JSON.parse(responseData);
          return res.json(parsedResponse);
        } catch (e) {
          console.error('Error parsing JSON response:', e);
          // If not valid JSON, return the raw response
          return res.json({ response: responseData.trim() });
        }
      } else {
        // No response data
        return res.status(500).json({ 
          error: 'No response from Python script',
          response: "I'm sorry, I couldn't generate a response at the moment."
        });
      }
    });
    
    // Handle process errors
    pythonProcess.on('error', (error) => {
      console.error('Error spawning Python process:', error);
      res.status(500).json({ 
        error: 'Failed to start Python process',
        details: error.message,
        response: "I'm sorry, I couldn't access my knowledge base at the moment."
      });
    });
    
  } catch (error) {
    console.error('Error in chat endpoint:', error);
    res.status(500).json({ 
      error: error.message,
      response: "I'm sorry, I encountered an error while processing your request."
    });
  }
});
router.get('/latest-data', async (req, res) => {
  try {
    console.log('Fetching specific data from Supabase...');
    
    // Create Supabase client
    const { createClient } = require('@supabase/supabase-js');
    const supabaseUrl = process.env.SUPABASE_URL || 'https://suvlgxhpsnvbbubpxrek.supabase.co';
    const supabaseKey = process.env.SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InN1dmxneGhwc252YmJ1YnB4cmVrIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDA4NjQyNDQsImV4cCI6MjA1NjQ0MDI0NH0.nklTCPMowGIL0CinhS0JxcfLipiLgUZAlp85y0rnWEU';
    const supabase = createClient(supabaseUrl, supabaseKey);
    
    // Get the specific record by ID
    const specificId = '61573b79-5e71-4f50-a969-b28108bab244';
    console.log(`Fetching record with ID: ${specificId}`);
    
    const { data, error } = await supabase
      .from('Fetched_Data')
      .select('*')
      .eq('id', specificId)
      .single();
      
    if (error) {
      console.error('Error fetching specific record:', error);
      
      // Try to get the most recent record instead
      console.log('Attempting to fetch the most recent record instead...');
      const { data: latestData, error: latestError } = await supabase
        .from('Fetched_Data')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(1)
        .single();
        
      if (latestError) {
        console.error('Error fetching latest record:', latestError);
        throw latestError;
      }
      
      if (!latestData) {
        console.error('No records found in the database');
        return res.status(404).json({ 
          error: 'No data found in the database',
        });
      }
      
      console.log('Retrieved latest data from Supabase:', latestData);
      
      // Check if latestData.data exists and is properly formatted
      if (!latestData.data) {
        console.error('Latest data structure is not as expected:', latestData);
        return res.status(500).json({ 
          error: 'Data structure is not as expected',
          actualData: latestData
        });
      }
      
      console.log('Sending latest data to client with keys:', Object.keys(latestData.data));
      return res.json(latestData.data);
    }
    
    console.log('Retrieved data from Supabase:', data);
    
    if (!data) {
      console.error('No data found with the specified ID');
      return res.status(404).json({ 
        error: 'No data found with the specified ID',
        requestedId: specificId
      });
    }
    
    // Check if data.data exists and is properly formatted
    if (!data.data) {
      console.error('Data structure is not as expected:', data);
      return res.status(500).json({ 
        error: 'Data structure is not as expected',
        actualData: data
      });
    }
    
    console.log('Sending data to client with keys:', Object.keys(data.data));
    res.json(data.data);
  } catch (error) {
    console.error('Error fetching specific data:', error);
    res.status(500).json({ 
      error: error.message,
      stack: error.stack
    });
  }
});
router.get("/debug-data", async (req, res) => {
  try {
    console.log("Debugging Supabase connection...");

    // Create Supabase client
    const { createClient } = require("@supabase/supabase-js");
    const supabaseUrl =
      process.env.SUPABASE_URL || "https://suvlgxhpsnvbbubpxrek.supabase.co";
    const supabaseKey =
      process.env.SUPABASE_ANON_KEY ||
      "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InN1dmxneGhwc252YmJ1YnB4cmVrIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDA4NjQyNDQsImV4cCI6MjA1NjQ0MDI0NH0.nklTCPMowGIL0CinhS0JxcfLipiLgUZAlp85y0rnWEU";
    const supabase = createClient(supabaseUrl, supabaseKey);

    // List all tables
    const { data: tableData, error: tableError } = await supabase
      .from('Fetched_Data')
      .select('id, created_at')
      .order('created_at', { ascending: false })
      .limit(10);

    if (tableError) {
      console.error("Error listing tables:", tableError);
      return res.status(500).json({
        error: "Error listing tables",
        details: tableError
      });
    }

    // Return debugging information
    return res.json({
      message: "Supabase connection test",
      tables: tableData,
      environment: {
        nodeEnv: process.env.NODE_ENV,
        supabaseUrl: supabaseUrl,
        // Don't include the full key for security
        supabaseKeyPrefix: supabaseKey.substring(0, 10) + "..."
      }
    });
  } catch (error) {
    console.error("Error in debug endpoint:", error);
    res.status(500).json({
      error: error.message,
      stack: error.stack
    });
  }
});
module.exports = router;