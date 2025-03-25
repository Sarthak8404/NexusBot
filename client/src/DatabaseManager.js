import React, { useState, useEffect } from 'react';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.REACT_APP_SUPABASE_URL || 'https://suvlgxhpsnvbbubpxrek.supabase.co';
const supabaseKey = process.env.REACT_APP_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InN1dmxneGhwc252YmJ1YnB4cmVrIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDA4NjQyNDQsImV4cCI6MjA1NjQ0MDI0NH0.nklTCPMowGIL0CinhS0JxcfLipiLgUZAlp85y0rnWEU';
const supabase = createClient(supabaseUrl, supabaseKey);

const DatabaseManager = () => {
  const [records, setRecords] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedRecord, setSelectedRecord] = useState(null);
  const [isEditing, setIsEditing] = useState(false);
  const [editedData, setEditedData] = useState(null);
  const [saveSuccess, setSaveSuccess] = useState(null);

  // Fetch all records from the database
  useEffect(() => {
    fetchRecords();
  }, []);

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

  // Handle record selection
  const handleSelectRecord = (record) => {
    setSelectedRecord(record);
    setEditedData(null);
    setIsEditing(false);
    setSaveSuccess(null);
  };

  // Start editing a record
  const handleEditRecord = () => {
    if (!selectedRecord) return;
    setEditedData(JSON.parse(JSON.stringify(selectedRecord.data)));
    setIsEditing(true);
    setSaveSuccess(null);
  };

  // Handle changes to edited data
  const handleDataChange = (section, index, field, value) => {
    setEditedData(prevData => {
      const newData = { ...prevData };
      
      if (Array.isArray(newData[section])) {
        // For array data like products, faq, policies
        if (index !== undefined) {
          newData[section][index] = { 
            ...newData[section][index], 
            [field]: value 
          };
        }
      } else if (typeof newData[section] === 'object') {
        // For object data like contact
        newData[section] = { ...newData[section], [field]: value };
      } else {
        // For string data like about
        newData[section] = value;
      }
      
      return newData;
    });
  };

  // Save edited record
  const handleSaveRecord = async () => {
    try {
      setLoading(true);
      setSaveSuccess(null);
      
      const { data, error } = await supabase
        .from('Fetched_Data')
        .update({ 
          data: editedData,
          updated_at: new Date().toISOString()
        })
        .eq('id', selectedRecord.id);
      
      if (error) throw error;
      
      // Update the local state
      setRecords(prevRecords => 
        prevRecords.map(record => 
          record.id === selectedRecord.id 
            ? { ...record, data: editedData, updated_at: new Date().toISOString() } 
            : record
        )
      );
      
      setSelectedRecord({ ...selectedRecord, data: editedData, updated_at: new Date().toISOString() });
      setIsEditing(false);
      setSaveSuccess('Record updated successfully!');
    } catch (error) {
      console.error('Error updating record:', error);
      setError(`Failed to update record: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  // Delete a record
  const handleDeleteRecord = async () => {
    if (!window.confirm('Are you sure you want to delete this record? This action cannot be undone.')) {
      return;
    }
    
    try {
      setLoading(true);
      
      const { error } = await supabase
        .from('Fetched_Data')
        .delete()
        .eq('id', selectedRecord.id);
      
      if (error) throw error;
      
      // Update the local state
      setRecords(prevRecords => prevRecords.filter(record => record.id !== selectedRecord.id));
      setSelectedRecord(null);
      setSaveSuccess('Record deleted successfully!');
    } catch (error) {
      console.error('Error deleting record:', error);
      setError(`Failed to delete record: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  // Create a new empty record
  const handleCreateRecord = async () => {
    try {
      setLoading(true);
      setSaveSuccess(null);
      
      const emptyData = {
        products: [],
        contact: {},
        about: '',
        faq: [],
        policies: []
      };
      
      const { data, error } = await supabase
        .from('Fetched_Data')
        .insert([{
          data: emptyData,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        }])
        .select();
      
      if (error) throw error;
      
      // Update the local state
      if (data && data.length > 0) {
        setRecords(prevRecords => [data[0], ...prevRecords]);
        setSelectedRecord(data[0]);
        setEditedData(emptyData);
        setIsEditing(true);
        setSaveSuccess('New record created! You can now edit it.');
      }
    } catch (error) {
      console.error('Error creating record:', error);
      setError(`Failed to create record: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  // Add a new item to an array section (products, faq, policies)
  const handleAddItem = (section) => {
    if (!isEditing || !editedData) return;
    
    setEditedData(prevData => {
      const newData = { ...prevData };
      
      if (!Array.isArray(newData[section])) {
        newData[section] = [];
      }
      
      // Create empty item based on section type
      let newItem = {};
      
      if (section === 'products') {
        newItem = { name: '', price: '', description: '', imageUrl: '' };
      } else if (section === 'faq') {
        newItem = { question: '', answer: '' };
      } else if (section === 'policies') {
        newItem = { title: '', content: '' };
      }
      
      newData[section] = [...newData[section], newItem];
      return newData;
    });
  };

  // Remove an item from an array section
  const handleRemoveItem = (section, index) => {
    if (!isEditing || !editedData) return;
    
    setEditedData(prevData => {
      const newData = { ...prevData };
      
      if (Array.isArray(newData[section])) {
        newData[section] = newData[section].filter((_, i) => i !== index);
      }
      
      return newData;
    });
  };
  const renderDataValue = (value) => {
    if (value === null || value === undefined) {
      return <span className="text-gray-400">None</span>;
    }
    
    if (typeof value === 'object') {
      return JSON.stringify(value);
    }
    
    return value.toString();
  };
  
  // Render the record list
  const renderRecordList = () => {
    if (loading && records.length === 0) {
      return <p className="text-gray-500">Loading records...</p>;
    }
    
    if (records.length === 0) {
      return <p className="text-gray-500">No records found in the database.</p>;
    }
    
    return (
      <div className="space-y-2">
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
                  {record.data?.faq?.length || 0} FAQs, 
                  {record.data?.policies?.length || 0} Policies
                </span>
              </div>
              <div className="text-sm text-gray-500">
                {new Date(record.created_at).toLocaleString()}
              </div>
            </div>
          </div>
        ))}
      </div>
    );
  };

  // Render the record details
  const renderRecordDetails = () => {
    if (!selectedRecord) {
      return (
        <div className="text-center p-8 bg-gray-50 rounded-lg">
          <p className="text-gray-500">Select a record to view details</p>
        </div>
      );
    }
    
    const data = isEditing ? editedData : selectedRecord.data;
    
    return (
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <h3 className="text-lg font-medium">Record Details</h3>
          <div className="space-x-2">
            {isEditing ? (
              <>
                <button
                  onClick={handleSaveRecord}
                  disabled={loading}
                  className="px-3 py-1 bg-green-600 text-white rounded-md hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-opacity-50 disabled:opacity-50"
                >
                  Save Changes
                </button>
                <button
                  onClick={() => setIsEditing(false)}
                  className="px-3 py-1 bg-gray-200 text-gray-800 rounded-md hover:bg-gray-300 focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-opacity-50"
                >
                  Cancel
                </button>
              </>
            ) : (
              <>
                <button
                  onClick={handleEditRecord}
                  className="px-3 py-1 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-opacity-50"
                >
                  Edit
                </button>
                <button
                  onClick={handleDeleteRecord}
                  className="px-3 py-1 bg-red-600 text-white rounded-md hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-opacity-50"
                >
                  Delete
                </button>
              </>
            )}
          </div>
        </div>
        
        <div className="text-sm text-gray-500">
          <p>Created: {new Date(selectedRecord.created_at).toLocaleString()}</p>
          <p>Last Updated: {new Date(selectedRecord.updated_at).toLocaleString()}</p>
        </div>
        
        <div className="space-y-4">
          {/* Products Section */}
          <div className="border rounded-lg p-4">
            <div className="flex justify-between items-center mb-2">
              <h4 className="font-medium">Products ({data?.products?.length || 0})</h4>
              {isEditing && (
                <button
                  onClick={() => handleAddItem('products')}
                  className="px-2 py-1 text-sm bg-blue-100 text-blue-700 rounded hover:bg-blue-200"
                >
                  Add Product
                </button>
              )}
            </div>
            
            {data?.products && data.products.length > 0 ? (
              <div className="space-y-3">
                {data.products.map((product, index) => (
                  <div key={index} className="border-b pb-2">
                    {isEditing ? (
                      <div className="space-y-2">
                        <div className="flex justify-between">
                          <div className="font-medium">Product #{index + 1}</div>
                          <button
                            onClick={() => handleRemoveItem('products', index)}
                            className="text-red-600 text-sm hover:text-red-800"
                          >
                            Remove
                          </button>
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700">Name</label>
                          <input
                            type="text"
                            value={product.name || ''}
                            onChange={(e) => handleDataChange('products', index, 'name', e.target.value)}
                            className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2"
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700">Price</label>
                          <input
                            type="text"
                            value={product.price || ''}
                            onChange={(e) => handleDataChange('products', index, 'price', e.target.value)}
                            className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2"
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700">Description</label>
                          <textarea
                            value={product.description || ''}
                            onChange={(e) => handleDataChange('products', index, 'description', e.target.value)}
                            className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2"
                            rows="3"
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700">Image URL</label>
                          <input
                            type="text"
                            value={product.imageUrl || ''}
                            onChange={(e) => handleDataChange('products', index, 'imageUrl', e.target.value)}
                            className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2"
                          />
                        </div>
                      </div>
                    ) : (
                      <>
                        <p className="font-medium">{product.name}</p>
                        <p className="text-blue-600">{product.price}</p>
                        <p className="text-sm text-gray-600">{product.description}</p>
                        {product.imageUrl && (
                          <img src={product.imageUrl} alt={product.name} className="mt-2 max-h-32 object-contain" />
                        )}
                      </>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-gray-500">No products in this record.</p>
            )}
          </div>
          
          {/* Contact Section */}
          <div className="border rounded-lg p-4">
            <h4 className="font-medium mb-2">Contact Information</h4>
            {data?.contact && Object.keys(data.contact).length > 0 ? (
              <div className="space-y-2">
                {isEditing ? (
                  <>
                    <div>
                      <label className="block text-sm font-medium text-gray-700">Email</label>
                      <input
                        type="text"
                        value={data.contact.email || ''}
                        onChange={(e) => handleDataChange('contact', undefined, 'email', e.target.value)}
                        className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700">Phone</label>
                      <input
                        type="text"
                        value={data.contact.phone || ''}
                        onChange={(e) => handleDataChange('contact', undefined, 'phone', e.target.value)}
                        className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700">Address</label>
                      <input
                        type="text"
                        value={data.contact.address || ''}
                        onChange={(e) => handleDataChange('contact', undefined, 'address', e.target.value)}
                        className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2"
                      />
                    </div>
                  </>
                ) : (
                  <>
                    {data.contact.email && <p><span className="font-medium">Email:</span> {data.contact.email}</p>}
                    {data.contact.phone && <p><span className="font-medium">Phone:</span> {data.contact.phone}</p>}
                    {data.contact.address && <p><span className="font-medium">Address:</span> {data.contact.address}</p>}
                  </>
                )}
              </div>
            ) : (
              <p className="text-gray-500">No contact information in this record.</p>
            )}
          </div>
          
          {/* About Section */}
          <div className="border rounded-lg p-4">
            <h4 className="font-medium mb-2">About</h4>
            {isEditing ? (
              <textarea
                value={typeof data?.about === 'object' ? JSON.stringify(data.about, null, 2) : data?.about || ''}
                onChange={(e) => handleDataChange('about', undefined, undefined, e.target.value)}
                className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2"
                rows="5"
              />
            ) : (
              <div>
                {data?.about ? (
                  typeof data.about === 'object' ? (
                    <div className="space-y-2">
                      {Object.entries(data.about).map(([key, value]) => (
                        <div key={key}>
                          <span className="font-medium capitalize">{key}: </span>
                          <span>{renderDataValue(value)}</span>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-gray-700">{data.about}</p>
                  )
                ) : (
                  <p className="text-gray-500">No about information in this record.</p>
                )}
              </div>
            )}
          </div>
          
          {/* FAQ Section */}
          <div className="border rounded-lg p-4">
            <div className="flex justify-between items-center mb-2">
              <h4 className="font-medium">FAQs ({data?.faq?.length || 0})</h4>
              {isEditing && (
                <button
                  onClick={() => handleAddItem('faq')}
                  className="px-2 py-1 text-sm bg-blue-100 text-blue-700 rounded hover:bg-blue-200"
                >
                  Add FAQ
                </button>
              )}
            </div>
            
            {data?.faq && data.faq.length > 0 ? (
              <div className="space-y-3">
                {data.faq.map((faq, index) => (
                  <div key={index} className="border-b pb-2">
                    {isEditing ? (
                      <div className="space-y-2">
                        <div className="flex justify-between">
                          <div className="font-medium">FAQ #{index + 1}</div>
                          <button
                            onClick={() => handleRemoveItem('faq', index)}
                            className="text-red-600 text-sm hover:text-red-800"
                          >
                            Remove
                          </button>
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700">Question</label>
                          <input
                            type="text"
                            value={faq.question || ''}
                            onChange={(e) => handleDataChange('faq', index, 'question', e.target.value)}
                            className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2"
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700">Answer</label>
                          <textarea
                            value={faq.answer || ''}
                            onChange={(e) => handleDataChange('faq', index, 'answer', e.target.value)}
                            className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2"
                            rows="3"
                          />
                        </div>
                      </div>
                    ) : (
                      <>
                        <p className="font-medium">{faq.question}</p>
                        <p className="text-gray-600">{faq.answer}</p>
                      </>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-gray-500">No FAQs in this record.</p>
            )}
          </div>
          
          {/* Policies Section */}
          <div className="border rounded-lg p-4">
            <div className="flex justify-between items-center mb-2">
              <h4 className="font-medium">Policies ({data?.policies?.length || 0})</h4>
              {isEditing && (
                <button
                  onClick={() => handleAddItem('policies')}
                  className="px-2 py-1 text-sm bg-blue-100 text-blue-700 rounded hover:bg-blue-200"
                >
                  Add Policy
                </button>
              )}
            </div>
            
            {data?.policies && data.policies.length > 0 ? (
              <div className="space-y-3">
                {data.policies.map((policy, index) => (
                  <div key={index} className="border-b pb-2">
                    {isEditing ? (
                      <div className="space-y-2">
                        <div className="flex justify-between">
                          <div className="font-medium">Policy #{index + 1}</div>
                          <button
                            onClick={() => handleRemoveItem('policies', index)}
                            className="text-red-600 text-sm hover:text-red-800"
                          >
                            Remove
                          </button>
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700">Title</label>
                          <input
                            type="text"
                            value={policy.title || ''}
                            onChange={(e) => handleDataChange('policies', index, 'title', e.target.value)}
                            className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2"
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700">Content</label>
                          <textarea
                            value={policy.content || ''}
                            onChange={(e) => handleDataChange('policies', index, 'content', e.target.value)}
                            className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2"
                            rows="3"
                          />
                        </div>
                      </div>
                    ) : (
                      <>
                        <p className="font-medium">{policy.title}</p>
                        <p className="text-gray-600">{policy.content}</p>
                      </>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-gray-500">No policies in this record.</p>
            )}
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-bold text-gray-800">Database Manager</h2>
        <div className="space-x-2">
          <button
            onClick={handleCreateRecord}
            className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-opacity-50"
          >
            Create New Record
          </button>
          <button
            onClick={fetchRecords}
            className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-opacity-50"
          >
            Refresh Records
          </button>
        </div>
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
      
      {saveSuccess && (
        <div className="bg-green-50 border-l-4 border-green-500 p-4 mb-4">
          <div className="flex">
            <div className="flex-shrink-0">
              <svg className="h-5 w-5 text-green-500" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
              </svg>
            </div>
            <div className="ml-3">
              <p className="text-sm text-green-700">{saveSuccess}</p>
            </div>
          </div>
        </div>
      )}
      
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="md:col-span-1">
          <div className="bg-white shadow rounded-lg p-4">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-medium">Records</h3>
              {loading && <p className="text-sm text-gray-500">Loading...</p>}
            </div>
            {renderRecordList()}
          </div>
        </div>
        <div className="md:col-span-2">
          <div className="bg-white shadow rounded-lg p-4">
            {renderRecordDetails()}
          </div>
        </div>
      </div>
    </div>
  );
};

export default DatabaseManager;