import React, { useState, useEffect, useRef } from 'react';
import { createClient } from '@supabase/supabase-js';
const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000';
const supabaseUrl = process.env.REACT_APP_SUPABASE_URL || 'https://suvlgxhpsnvbbubpxrek.supabase.co';
const supabaseKey = process.env.REACT_APP_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InN1dmxneGhwc252YmJ1YnB4cmVrIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDA4NjQyNDQsImV4cCI6MjA1NjQ0MDI0NH0.nklTCPMowGIL0CinhS0JxcfLipiLgUZAlp85y0rnWEU';
const supabase = createClient(supabaseUrl, supabaseKey);

const ChatbotTester = () => {
  const [records, setRecords] = useState([]);
  const [selectedRecord, setSelectedRecord] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [messages, setMessages] = useState([
    { role: 'system', content: 'Welcome! I\'m a chatbot trained on your website data. Ask me anything about your products, policies, or company information.' }
  ]);
  const [userInput, setUserInput] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const messagesEndRef = useRef(null);
  const [telegramToken, setTelegramToken] = useState('');
  const [telegramStatus, setTelegramStatus] = useState('');
  const [showTelegramInput, setShowTelegramInput] = useState(false);

  // Fetch all records from the database
  useEffect(() => {
    fetchRecords();
  }, []);

  // Scroll to bottom of chat whenever messages change
  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const fetchRecords = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('Fetched_Data')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setRecords(data || []);
    } catch (error) {
      console.error('Error fetching records:', error);
      setError(`Failed to fetch records: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  const handleSelectRecord = (record) => {
    setSelectedRecord(record);
    // Reset chat when selecting a new record
    setMessages([
      { role: 'system', content: 'Welcome! I\'m a chatbot trained on your website data. Ask me anything about your products, policies, or company information.' }
    ]);
  };

  const handleSendMessage = async (e) => {
    e.preventDefault();
    
    if (!userInput.trim() || !selectedRecord) return;
    
    // Add user message to chat
    const newUserMessage = { role: 'user', content: userInput };
    setMessages(prev => [...prev, newUserMessage]);
    setUserInput('');
    setIsTyping(true);
    
    try {
      // Generate bot response based on the selected record data
      const botResponse = await generateBotResponse(userInput, selectedRecord.data);
      
      // Add bot response to chat after a small delay to simulate thinking
      setTimeout(() => {
        setMessages(prev => [...prev, { role: 'assistant', content: botResponse }]);
        setIsTyping(false);
      }, 500);
    } catch (error) {
      console.error('Error generating response:', error);
      setMessages(prev => [...prev, { 
        role: 'assistant', 
        content: 'Sorry, I encountered an error while processing your request.' 
      }]);
      setIsTyping(false);
    }
  };

  const generateBotResponse = async (userQuery, websiteData) => {
    try {
      console.log('Sending query to API:', userQuery);
      console.log('Website data keys:', Object.keys(websiteData));
      
      // Use the API_BASE_URL variable instead of hardcoded URL
      const response = await fetch(`${API_BASE_URL}/api/chat`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          query: userQuery,
          websiteData: websiteData,
        }),
      });

      console.log('API response status:', response.status);
      
      if (!response.ok) {
        const errorText = await response.text();
        console.error('API response not OK:', response.status, errorText);
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const result = await response.json();
      console.log('API response data:', result);
      
      // Check if the response has the expected format
      if (result && result.response) {
        return result.response;
      } else if (result && result.error) {
        console.error('API returned error:', result.error);
        throw new Error(`API error: ${result.error}`);
      } else {
        console.error('Unexpected response format:', result);
        throw new Error('Unexpected response format from API');
      }
    } catch (error) {
      console.error('Error in generateBotResponse:', error);
      throw error; // Re-throw to be handled by the caller
    }
  };
  const formatMessageContent = (content) => {
    // Convert newlines to <br> tags for proper display
    return content.split('\n').map((line, index) => (
      <React.Fragment key={index}>
        {line}
        <br />
      </React.Fragment>
    ));
  };
  const copyIntegrationCode = () => {
    if (!selectedRecord) return;
    
    const integrationCode = `<script>
  // Chatbot integration code for website
  // Data source ID: ${selectedRecord.id}
  // Generated on: ${new Date().toLocaleString()}
  
  // Add your custom integration code here
  // This will be populated with your actual integration code
</script>`;
    
    navigator.clipboard.writeText(integrationCode)
      .then(() => {
        alert('Website Integration code copied to clipboard! \n Just add this js in your index.html file');
      })
      .catch(err => {
        console.error('Failed to copy integration code:', err);
        alert('Failed to copy integration code. Please try again.');
      });
  };
  const toggleTelegramInput = () => {
    setShowTelegramInput(!showTelegramInput);
  };

  const connectToTelegram = async () => {
    if (!telegramToken || !selectedRecord) return;
    
    setTelegramStatus('connecting');
    
    try {
      console.log('Connecting to Telegram with token:', telegramToken.substring(0, 5) + '...');
      console.log('Using API URL:', `${API_BASE_URL}/api/telegram/connect`);
      
      // Add more debugging and use a more robust fetch approach
      const response = await fetch(`${API_BASE_URL}/api/telegram/connect`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        },
        body: JSON.stringify({
          token: telegramToken,
          recordId: selectedRecord.id
        }),
        mode: 'cors' // Explicitly set CORS mode
      });
      
      console.log('Telegram API response status:', response.status);
      
      
      if (!response.ok) {
        const errorText = await response.text();
        console.error('Telegram API response error:', response.status, errorText);
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const result = await response.json();
      console.log('Telegram API response:', result);
      
      if (result.success) {
        setTelegramStatus('connected');
        setTimeout(() => {
          setShowTelegramInput(false);
          setTelegramStatus('');
        }, 3000);
      } else {
        console.error('Telegram connection failed:', result.error);
        setTelegramStatus('error');
        setTimeout(() => {
          setTelegramStatus('');
        }, 3000);
      }
    } catch (error) {
      console.error('Error connecting to Telegram:', error);
      setTelegramStatus('error');
      setTimeout(() => {
        setTelegramStatus('');
      }, 3000);
    }
  };
  return (
    <div className="container mx-auto px-4 py-8">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-bold text-gray-800">Chatbot Tester</h2>
      </div>
      
      {error && (
        <div className="bg-red-50 border-l-4 border-red-500 p-4 mb-4">
          <div className="flex">
            <div className="flex-shrink-0">
              <svg className="h-5 w-5 text-red-500" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
              </svg>
            </div>
            <div className="ml-3">
              <p className="text-sm text-red-700">{error}</p>
            </div>
          </div>
        </div>
      )}
      
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="md:col-span-1">
          <div className="bg-white shadow rounded-lg p-4">
          <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-medium">Select Data Source</h3>
              {selectedRecord && (
                <div className="flex space-x-2">
                  <button
                    onClick={copyIntegrationCode}
                    className="px-3 py-1 bg-green-600 text-white text-sm rounded hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-green-500"
                  >
                    Copy Code to Integrate
                  </button>
                  <button
                    onClick={toggleTelegramInput}
                    className="px-3 py-1 bg-blue-600 text-white text-sm rounded hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    {showTelegramInput ? 'Hide' : 'Telegram Bot'}
                  </button>
                </div>
              )}
            </div>
             
            {showTelegramInput && selectedRecord && (
              <div className="mb-4 p-3 border rounded-lg bg-gray-50">
                <h4 className="text-sm font-medium mb-2">Connect to Telegram</h4>
                <div className="flex space-x-2">
                  <input
                    type="text"
                    value={telegramToken}
                    onChange={(e) => setTelegramToken(e.target.value)}
                    placeholder="Enter Telegram Bot Token"
                    className="flex-1 px-3 py-1 text-sm border rounded focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                  <button
                    onClick={connectToTelegram}
                    disabled={telegramStatus === 'connecting'}
                    className={`px-3 py-1 text-sm rounded focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                      telegramStatus === 'connecting' 
                        ? 'bg-gray-400 text-white' 
                        : telegramStatus === 'connected'
                          ? 'bg-green-600 text-white'
                          : telegramStatus === 'error'
                            ? 'bg-red-600 text-white'
                            : 'bg-blue-600 text-white hover:bg-blue-700'
                    }`}
                  >
                    {telegramStatus === 'connecting' 
                      ? 'Connecting...' 
                      : telegramStatus === 'connected'
                        ? 'Connected!'
                        : telegramStatus === 'error'
                          ? 'Failed'
                          : 'Connect'}
                  </button>
                </div>
                <p className="text-xs text-gray-500 mt-2">
                  Get a token from BotFather on Telegram. This will connect your selected data source to your Telegram bot.
                </p>
              </div>
            )}
            
            {loading && records.length === 0 ? (
              <p className="text-gray-500">Loading records...</p>
            ) : records.length === 0 ? (
              <p className="text-gray-500">No records found. Please scrape some data first.</p>
            ) : (
              <div className="space-y-2 max-h-96 overflow-y-auto">
                {records.map(record => (
                  <div 
                    key={record.id} 
                    className={`p-3 border rounded-lg cursor-pointer hover:bg-gray-50 ${
                      selectedRecord?.id === record.id ? 'bg-blue-50 border-blue-300' : ''
                    }`}
                    onClick={() => handleSelectRecord(record)}
                  >
                    <div className="flex justify-between">
                      <div>
                        <span className="font-medium">
                          {record.data?.products?.length || 0} Products, 
                          {record.data?.faq?.length || 0} FAQs
                        </span>
                      </div>
                      <div className="text-sm text-gray-500">
                        {new Date(record.created_at).toLocaleString()}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
        
        <div className="md:col-span-2">
          <div className="bg-white shadow rounded-lg flex flex-col h-[600px]">
            <div className="p-4 border-b">
              <h3 className="text-lg font-medium">
                {selectedRecord ? 'Chat with your website data' : 'Select a data source to start chatting'}
              </h3>
            </div>
            
            <div className="flex-1 overflow-y-auto p-4 space-y-4">
              {messages.map((message, index) => (
                <div 
                  key={index} 
                  className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
                >
                  <div 
                    className={`max-w-3/4 rounded-lg p-3 ${
                      message.role === 'user' 
                        ? 'bg-blue-600 text-white' 
                        : message.role === 'system'
                          ? 'bg-gray-100 text-gray-800 border border-gray-200'
                          : 'bg-gray-200 text-gray-800'
                    }`}
                  >
                    {formatMessageContent(message.content)}
                  </div>
                </div>
              ))}
              
              {isTyping && (
                <div className="flex justify-start">
                  <div className="bg-gray-200 text-gray-800 rounded-lg p-3">
                    <div className="flex space-x-1">
                      <div className="w-2 h-2 bg-gray-500 rounded-full animate-bounce"></div>
                      <div className="w-2 h-2 bg-gray-500 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
                      <div className="w-2 h-2 bg-gray-500 rounded-full animate-bounce" style={{ animationDelay: '0.4s' }}></div>
                    </div>
                  </div>
                </div>
              )}
              
              <div ref={messagesEndRef} />
            </div>
            
            <div className="p-4 border-t">
              <form onSubmit={handleSendMessage} className="flex space-x-2">
                <input
                  type="text"
                  value={userInput}
                  onChange={(e) => setUserInput(e.target.value)}
                  placeholder={selectedRecord ? "Type your message..." : "Select a data source first"}
                  disabled={!selectedRecord || isTyping}
                  className="flex-1 px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 disabled:bg-gray-100 disabled:text-gray-500"
                />
                <button
                  type="submit"
                  disabled={!selectedRecord || !userInput.trim() || isTyping}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-opacity-50 disabled:opacity-50"
                >
                  Send
                </button>
              </form>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ChatbotTester;