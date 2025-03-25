
import React from 'react';
import { BrowserRouter as Router, Routes, Route, Link } from 'react-router-dom';
import WebsiteDataScraper from './WebsiteDataScraper';
import DatabaseManager from './DatabaseManager';
import ChatbotTester from './ChatbotTester';

function App() {
  return (
    <Router>
      <div className="min-h-screen bg-gray-100">
        <nav className="bg-white shadow-sm">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex justify-between h-16">
              <div className="flex">
                <div className="flex-shrink-0 flex items-center">
                  <h1 className="text-xl font-bold text-gray-800">Website Data Scraper</h1>
                </div>
                <div className="ml-6 flex space-x-8">
                  <Link to="/" className="inline-flex items-center px-1 pt-1 border-b-2 border-transparent text-sm font-medium text-gray-500 hover:text-gray-700 hover:border-gray-300">
                    Scraper
                  </Link>
                  <Link to="/database" className="inline-flex items-center px-1 pt-1 border-b-2 border-transparent text-sm font-medium text-gray-500 hover:text-gray-700 hover:border-gray-300">
                    Database Manager
                  </Link>
                  <Link to="/chatbot" className="inline-flex items-center px-1 pt-1 border-b-2 border-transparent text-sm font-medium text-gray-500 hover:text-gray-700 hover:border-gray-300">
                    Chatbot Tester
                  </Link>
                </div>
              </div>
            </div>
          </div>
        </nav>

        <div className="py-10">
          <Routes>
            <Route path="/" element={<WebsiteDataScraper />} />
            <Route path="/database" element={<DatabaseManager />} />
            <Route path="/chatbot" element={<ChatbotTester />} />
          </Routes>
        </div>
      </div>
    </Router>
  );
}

export default App;