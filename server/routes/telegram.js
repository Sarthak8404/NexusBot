const express = require('express');
const { Telegraf } = require('telegraf');
const router = express.Router();
const fetch = require('node-fetch');
const cors = require('cors');
const path = require('path');
const { spawn } = require('child_process');

// Store active bots
router.use(cors({
  origin: ['http://localhost:3000', 'http://127.0.0.1:3000'],
  methods: ['GET', 'POST', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));
router.options('*', cors());
const activeBots = new Map();

router.post('/connect', async (req, res) => {
  try {
    const { token, recordId } = req.body;
    
    if (!token || !recordId) {
      return res.status(400).json({ 
        success: false, 
        error: 'Missing token or recordId' 
      });
    }
    
    // Check if we already have a bot with this token
    if (activeBots.has(token)) {
      // Stop the existing bot
      const existingBot = activeBots.get(token);
      existingBot.stop('RESTART');
      activeBots.delete(token);
    }
    
    // Create and configure the bot
    const bot = new Telegraf(token);
    
    // Store active conversations with their selected record ID
    const activeConversations = new Map();
    
    // Command to start the bot
    bot.start((ctx) => {
      const userId = ctx.from.id;
      activeConversations.set(userId, { recordId });
      ctx.reply('Welcome to your website chatbot! You can now ask me anything about the website data.');
    });
    
    // Handle text messages
    bot.on('text', async (ctx) => {
      const userId = ctx.from.id;
      const userQuery = ctx.message.text;
      
      // Check if user has started the bot
      if (!activeConversations.has(userId)) {
        activeConversations.set(userId, { recordId });
      }
      
      try {
        // Get the record ID for this conversation
        const conversationData = activeConversations.get(userId);
        
        // Fetch the website data from Supabase
        const { createClient } = require('@supabase/supabase-js');
        const supabaseUrl = process.env.SUPABASE_URL || 'https://suvlgxhpsnvbbubpxrek.supabase.co';
        const supabaseKey = process.env.SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InN1dmxneGhwc252YmJ1YnB4cmVrIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDA4NjQyNDQsImV4cCI6MjA1NjQ0MDI0NH0.nklTCPMowGIL0CinhS0JxcfLipiLgUZAlp85y0rnWEU';
        const supabase = createClient(supabaseUrl, supabaseKey);
        
        // Fetch the record data
        const { data: recordData, error: recordError } = await supabase
          .from('Fetched_Data')
          .select('data')
          .eq('id', conversationData.recordId)
          .single();
        
        if (recordError) {
          throw new Error(`Failed to fetch record data: ${recordError.message}`);
        }
        
        if (!recordData || !recordData.data) {
          throw new Error('No data found for this record');
        }
        
        // Show typing indicator
        ctx.telegram.sendChatAction(ctx.chat.id, 'typing');
        
        // Process the query using the same Python script as the web interface
        const pythonScriptPath = path.join(__dirname, '..', '..', 'python', 'chat_processor.py');
        
        // Check if the Python script exists
        const fs = require('fs');
        if (!fs.existsSync(pythonScriptPath)) {
          throw new Error(`Python script not found at: ${pythonScriptPath}`);
        }
        
        // Use the same approach as in chatRoutes.js
        const pythonProcess = spawn('python', [
          pythonScriptPath,
          JSON.stringify({
            query: userQuery,
            websiteData: recordData.data
          })
        ], {
          env: {
            ...process.env,
            GEMINI_API_KEY: process.env.GEMINI_API_KEY || 'AIzaSyDmTQWxYav1L1My6Fz-VxXLSTCA5lR0La8'
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
        
        pythonProcess.on('close', async (code) => {
          if (code !== 0) {
            console.error(`Python process failed with exit code ${code}`);
            console.error(`Error output: ${errorString}`);
            await ctx.reply('Sorry, I encountered an error while processing your request.');
            return;
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
            
            if (jsonData.response) {
              await ctx.reply(jsonData.response);
            } else if (jsonData.error) {
              throw new Error(jsonData.error);
            } else {
              throw new Error('Unexpected response format from Python script');
            }
          } catch (error) {
            console.error('Failed to parse script output:', error);
            console.error('Raw output:', dataString);
            await ctx.reply('Sorry, I encountered an error while processing your request.');
          }
        });
      } catch (error) {
        console.error('Error processing message:', error);
        await ctx.reply('Sorry, I encountered an error while processing your request.');
      }
    });
    
    // Start the bot
    bot.launch()
      .then(() => {
        console.log(`Bot connected successfully for record ID: ${recordId}`);
        activeBots.set(token, bot);
        
        res.json({
          success: true,
          message: 'Bot connected successfully'
        });
      })
      .catch(error => {
        console.error('Error launching bot:', error);
        res.status(500).json({
          success: false,
          error: `Failed to launch bot: ${error.message}`
        });
      });
    
    // Enable graceful stop
    process.once('SIGINT', () => {
      bot.stop('SIGINT');
    });
    process.once('SIGTERM', () => {
      bot.stop('SIGTERM');
    });
    
  } catch (error) {
    console.error('Error connecting bot:', error);
    res.status(500).json({
      success: false,
      error: `Failed to connect bot: ${error.message}`
    });
  }
});

module.exports = router;