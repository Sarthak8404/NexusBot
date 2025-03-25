import React, { useState } from "react";
import { createClient } from "@supabase/supabase-js";
const supabaseUrl =
  process.env.REACT_APP_SUPABASE_URL ||
  "https://suvlgxhpsnvbbubpxrek.supabase.co";
const supabaseKey =
  process.env.REACT_APP_SUPABASE_ANON_KEY ||
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InN1dmxneGhwc252YmJ1YnB4cmVrIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDA4NjQyNDQsImV4cCI6MjA1NjQ0MDI0NH0.nklTCPMowGIL0CinhS0JxcfLipiLgUZAlp85y0rnWEU";
const supabase = createClient(supabaseUrl, supabaseKey);
const WebsiteDataScraper = () => {
  const [currentStep, setCurrentStep] = useState(1);
  const [savingToDb, setSavingToDb] = useState(false);
  const [loading, setLoading] = useState(false);
  const [urlFields, setUrlFields] = useState({
    products: [""],
    contact: [""],
    about: [""],
    faq: [""],
    policies: [""],
  });
  const [scrapedData, setScrapedData] = useState({
    products: [],
    contact: {},
    about: "",
    faq: [],
    policies: [],
  });
  const [approvedData, setApprovedData] = useState({
    products: [],
    contact: {},
    about: null,
    faq: [],
    policies: [],
  });

  const [error, setError] = useState(null);

  const [saveSuccess, setSaveSuccess] = useState(null);

  const handleUrlChange = (e, type, index) => {
    const newUrls = [...urlFields[type]];
    newUrls[index] = e.target.value;
    setUrlFields((prev) => ({
      ...prev,
      [type]: newUrls,
    }));
  };

  const addUrlField = (type) => {
    setUrlFields((prev) => ({
      ...prev,
      [type]: [...prev[type], ""],
    }));
  };

  const removeUrlField = (type, index) => {
    if (urlFields[type].length <= 1) return;
    const newUrls = [...urlFields[type]];
    newUrls.splice(index, 1);
    setUrlFields((prev) => ({
      ...prev,
      [type]: newUrls,
    }));
  };

  // Inside your WebsiteDataScraper component, update the handleScrape function

  const ErrorDisplay = ({ error, onRetry }) => {
    if (!error) return null;

    // Determine error type for better user feedback
    const isParsingError = error.includes("parse") || error.includes("JSON");
    const isNetworkError =
      error.includes("Failed to fetch") || error.includes("Network");
    const isTimeoutError =
      error.includes("timeout") || error.includes("aborted");

    return (
      <div className="bg-red-50 border-l-4 border-red-500 p-4 my-4">
        <div className="flex items-start">
          <div className="flex-shrink-0">
            <svg
              className="h-5 w-5 text-red-500"
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 20 20"
              fill="currentColor"
            >
              <path
                fillRule="evenodd"
                d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z"
                clipRule="evenodd"
              />
            </svg>
          </div>
          <div className="ml-3">
            <h3 className="text-sm font-medium text-red-800">
              Error Encountered
            </h3>
            <div className="mt-2 text-sm text-red-700">
              <p>{error}</p>

              {isParsingError && (
                <div className="mt-2 text-xs text-red-600">
                  <p>
                    The server had trouble processing the data from this
                    website. This could be due to:
                  </p>
                  <ul className="list-disc pl-5 mt-1">
                    <li>Complex website structure that's difficult to parse</li>
                    <li>Rate limiting or blocking by the website</li>
                    <li>Incomplete data returned from the website</li>
                  </ul>
                  <p className="mt-1">
                    Try a different URL or try again later.
                  </p>
                </div>
              )}

              {isNetworkError && (
                <div className="mt-2 text-xs text-red-600">
                  <p>
                    There was a problem connecting to the server. Please check
                    your internet connection and try again.
                  </p>
                </div>
              )}

              {isTimeoutError && (
                <div className="mt-2 text-xs text-red-600">
                  <p>
                    The request took too long to complete. This might be
                    because:
                  </p>
                  <ul className="list-disc pl-5 mt-1">
                    <li>The website is very large or slow to respond</li>
                    <li>The server is currently experiencing high load</li>
                  </ul>
                  <p className="mt-1">Try again or try a different URL.</p>
                </div>
              )}
            </div>
            {onRetry && (
              <div className="mt-4">
                <button
                  type="button"
                  onClick={onRetry}
                  className="inline-flex items-center px-3 py-2 border border-transparent text-sm leading-4 font-medium rounded-md text-red-700 bg-red-100 hover:bg-red-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500"
                >
                  Try Again
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    );
  };

  const toggleApproval = (type, index) => {
    // Check if the data type exists and is an array
    if (!Array.isArray(scrapedData[type])) {
      console.error(`scrapedData[${type}] is not an array`);
      return;
    }

    // Check if the index is valid
    if (index < 0 || index >= scrapedData[type].length) {
      console.error(`Invalid index ${index} for scrapedData[${type}]`);
      return;
    }

    // Check if the item at this index is null
    if (!scrapedData[type][index]) {
      console.error(`scrapedData[${type}][${index}] is null or undefined`);
      return;
    }

    setApprovedData((prev) => {
      // Make sure prev[type] is an array
      const newApproved = Array.isArray(prev[type]) ? [...prev[type]] : [];

      // Check if item already exists in approved array
      const existingIndex = newApproved.findIndex(
        (item) =>
          JSON.stringify(item) === JSON.stringify(scrapedData[type][index])
      );

      if (existingIndex >= 0) {
        // Remove if already approved
        newApproved.splice(existingIndex, 1);
      } else {
        // Add if not approved
        newApproved.push(scrapedData[type][index]);
      }

      return { ...prev, [type]: newApproved };
    });
  };
  const isApproved = (type, index) => {
    if (
      !scrapedData[type] ||
      !Array.isArray(scrapedData[type]) ||
      !approvedData[type] ||
      !Array.isArray(approvedData[type])
    ) {
      return false;
    }

    // Make sure the index is valid
    if (index < 0 || index >= scrapedData[type].length) {
      return false;
    }

    // Check if the item at this index is null
    if (!scrapedData[type][index]) {
      return false;
    }

    return approvedData[type].some(
      (item) =>
        JSON.stringify(item) === JSON.stringify(scrapedData[type][index])
    );
  };
  // Update your toggleObjectApproval function
  const toggleObjectApproval = (type) => {
    setApprovedData((prev) => {
      // If already approved (exists), remove it
      if (prev[type]) {
        if (type === "about") {
          return { ...prev, [type]: null };
        } else if (Object.keys(prev[type]).length > 0) {
          return { ...prev, [type]: {} };
        }
      }
      // Otherwise approve it
      return { ...prev, [type]: scrapedData[type] };
    });
  };
  const isObjectApproved = (type) => {
    if (type === "about") {
      return approvedData[type] !== null;
    }
    return approvedData[type] && Object.keys(approvedData[type]).length > 0;
  };
  // const saveToSupabase = async () => {
  //   setSavingToDb(true);
  //   setSaveSuccess(null);

  //   try {
  //     // Prepare data for saving
  //     const dataToSave = {
  //       products: approvedData.products,
  //       contact: approvedData.contact,
  //       about: approvedData.about,
  //       faq: approvedData.faq,
  //       policies: approvedData.policies,
  //       saved_at: new Date().toISOString()
  //     };

  //     // Insert data into Supabase
  //     const { data, error } = await supabase
  //       .from('scraped_data')
  //       .insert([dataToSave]);

  //     if (error) throw error;

  //     setSaveSuccess('Data successfully saved to database!');
  //     console.log('Saved data:', data);
  //   } catch (error) {
  //     console.error('Error saving to Supabase:', error);
  //     setError(`Failed to save to database: ${error.message}`);
  //   } finally {
  //     setSavingToDb(false);
  //   }
  // };
  // const saveToSupabase = async () => {
  //   setSavingToDb(true);
  //   setSaveSuccess(null);

  //   try {
  //     // Prepare data for saving with a simpler structure
  //     const dataToSave = {
  //       data: {
  //         products: approvedData.products,
  //         contact: approvedData.contact,
  //         about: approvedData.about,
  //         faq: approvedData.faq,
  //         policies: approvedData.policies
  //       },
  //       created_at: new Date().toISOString(),
  //       updated_at: new Date().toISOString()
  //     };

  //     // Insert data into Supabase
  //     const { data, error } = await supabase
  //       .from('Fetched_Data')
  //       .insert([dataToSave]);

  //     if (error) throw error;

  //     setSaveSuccess('Data successfully saved to database!');
  //     console.log('Saved data:', data);
  //   } catch (error) {
  //     console.error('Error saving to Supabase:', error);
  //     setError(`Failed to save to database: ${error.message}`);
  //   } finally {
  //     setSavingToDb(false);
  //   }
  // };
  const saveToSupabase = async () => {
    setSavingToDb(true);
    setSaveSuccess(null);

    // Check if any data is approved
    const hasApprovedProducts =
      Array.isArray(approvedData.products) && approvedData.products.length > 0;
    const hasApprovedContact =
      approvedData.contact && Object.keys(approvedData.contact).length > 0;
    const hasApprovedAbout = approvedData.about !== null;
    const hasApprovedFaq =
      Array.isArray(approvedData.faq) && approvedData.faq.length > 0;
    const hasApprovedPolicies =
      Array.isArray(approvedData.policies) && approvedData.policies.length > 0;

    const hasAnyApprovedData =
      hasApprovedProducts ||
      hasApprovedContact ||
      hasApprovedAbout ||
      hasApprovedFaq ||
      hasApprovedPolicies;

    if (!hasAnyApprovedData) {
      setError(
        "Please approve at least one piece of data before saving to the database."
      );
      setSavingToDb(false);
      return;
    }

    try {
      // Prepare data for saving with a simpler structure
      const dataToSave = {
        data: {
          products: approvedData.products || [],
          contact: approvedData.contact || {},
          about: approvedData.about || "",
          faq: approvedData.faq || [],
          policies: approvedData.policies || [],
        },
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };

      // Insert data into Supabase
      const { data, error } = await supabase
        .from("Fetched_Data")
        .insert([dataToSave]);

      if (error) throw error;

      setSaveSuccess("Data successfully saved to database!");
      console.log("Saved data:", data);
    } catch (error) {
      console.error("Error saving to Supabase:", error);
      setError(`Failed to save to database: ${error.message}`);
    } finally {
      setSavingToDb(false);
    }
  };
  const handleScrape = async (type) => {
    // Filter out empty URLs
    const urlsToScrape = urlFields[type].filter((url) => url.trim() !== "");
    if (urlsToScrape.length === 0) {
      setError("Please enter at least one valid URL");
      return;
    }

    setLoading(true);
    setError(null);

    try {
      console.log(
        `Sending request to scrape ${type} data for URLs:`,
        urlsToScrape
      );

      // Add timeout to fetch request for better UX
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 120000); // 2-minute timeout

      // Call the backend API
      const response = await fetch("http://localhost:5000/api/scrape", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ type, urls: urlsToScrape }),
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      // Handle non-OK responses
      if (!response.ok) {
        let errorMessage = `Server error: ${response.status}`;
        try {
          const errorData = await response.json();
          errorMessage = errorData.error || errorData.details || errorMessage;
        } catch (e) {
          // If we can't parse the response as JSON, use the status text
          errorMessage = `Server error: ${response.status} ${response.statusText}`;
        }
        throw new Error(errorMessage);
      }

      // Get the response as JSON
      const responseData = await response.json();
      console.log(`Received ${type} data:`, responseData);

      // Handle empty responses
      if (
        !responseData ||
        (Array.isArray(responseData) && responseData.length === 0)
      ) {
        setError(`No ${type} data found. Try a different URL.`);
      } else {
        setScrapedData((prev) => ({ ...prev, [type]: responseData }));
      }

      setLoading(false);
    } catch (error) {
      console.error("Error scraping data:", error);

      // Provide more helpful error messages based on the error type
      let errorMessage =
        error.message || "An error occurred while scraping data";

      if (error.name === "AbortError") {
        errorMessage =
          "The request took too long and was aborted. The website might be too large or slow to process.";
      } else if (errorMessage.includes("Failed to fetch")) {
        errorMessage =
          "Network error. Please check your internet connection and try again.";
      } else if (
        errorMessage.includes("parse") &&
        !errorMessage.includes("Server error")
      ) {
        errorMessage =
          "The server had trouble processing the data from this website. Try a different URL.";
      }

      setError(errorMessage);
      setLoading(false);
    }
  };
  const nextStep = () => {
    setCurrentStep((prev) => Math.min(prev + 1, 5));
  };

  const prevStep = () => {
    setCurrentStep((prev) => Math.max(prev - 1, 1));
  };

  // URL input field component with add/remove buttons
  const UrlInputGroup = ({ type, urls }) => {
    return (
      <div className="space-y-3">
        {urls.map((url, index) => (
          <div key={`${type}-${index}`} className="flex space-x-2">
            <input
              type="text"
              value={url}
              onChange={(e) => handleUrlChange(e, type, index)}
              placeholder={`https://yourstore.com/${type}`}
              className="flex-1 px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
            <button
              onClick={() => removeUrlField(type, index)}
              disabled={urls.length <= 1}
              className="px-3 py-2 border rounded-lg hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-opacity-50 disabled:opacity-50"
            >
              −
            </button>
            {index === urls.length - 1 && (
              <button
                onClick={() => addUrlField(type)}
                className="px-3 py-2 bg-gray-100 border rounded-lg hover:bg-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-opacity-50"
              >
                +
              </button>
            )}
          </div>
        ))}
      </div>
    );
  };

  // Display product data
  // const renderProductData = () => {
  //   if (!scrapedData.products || scrapedData.products.length === 0) {
  //     return <p className="text-gray-500">No products fetched yet. Enter URLs and click "Fetch Product Data".</p>;
  //   }

  //   return (
  //     <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
  //       {scrapedData.products.map((product, index) => (
  //         <div key={index} className="border rounded p-4 bg-white shadow-sm">
  //           {product.imageUrl && (
  //             <div className="mb-3 h-40 bg-gray-100 flex items-center justify-center overflow-hidden">
  //               <img
  //                 src={product.imageUrl}
  //                 alt={product.name}
  //                 className="object-contain h-full w-full"
  //                 onError={(e) => e.target.src = "https://via.placeholder.com/150"}
  //               />
  //             </div>
  //           )}
  //           <h3 className="font-medium text-lg">{product.name}</h3>
  //           <p className="text-blue-600 font-bold mt-1">{product.price}</p>
  //           {product.availability && (
  //             <p className={`text-sm mt-1 ${product.availability.toLowerCase().includes('in stock') ? 'text-green-600' : 'text-red-600'}`}>
  //               {product.availability}
  //             </p>
  //           )}
  //           <p className="text-gray-600 text-sm mt-2 line-clamp-3">{product.description}</p>
  //         </div>
  //       ))}
  //     </div>
  //   );
  // };
  const renderProductData = () => {
    if (!scrapedData.products || scrapedData.products.length === 0) {
      return (
        <p className="text-gray-500">
          No products fetched yet. Enter URLs and click "Fetch Product Data".
        </p>
      );
    }

    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {scrapedData.products.map((product, index) => (
          <div
            key={index}
            className="border rounded p-4 bg-white shadow-sm relative"
          >
            <div className="absolute top-2 right-2">
              <button
                onClick={() => toggleApproval("products", index)}
                className={`w-6 h-6 rounded-full flex items-center justify-center ${
                  isApproved("products", index)
                    ? "bg-green-500 text-white"
                    : "bg-gray-200 text-gray-600"
                }`}
                title={
                  isApproved("products", index)
                    ? "Approved"
                    : "Click to approve"
                }
              >
                {isApproved("products", index) ? "✓" : ""}
              </button>
            </div>

            {product.imageUrl && (
              <div className="mb-3 h-40 bg-gray-100 flex items-center justify-center overflow-hidden">
                <img
                  src={product.imageUrl}
                  alt={product.name}
                  className="object-contain h-full w-full"
                  onError={(e) =>
                    (e.target.src = "https://via.placeholder.com/150")
                  }
                />
              </div>
            )}
            <h3 className="font-medium text-lg">{product.name}</h3>
            <p className="text-blue-600 font-bold mt-1">{product.price}</p>
            {product.availability && (
              <p
                className={`text-sm mt-1 ${
                  product.availability.toLowerCase().includes("in stock")
                    ? "text-green-600"
                    : "text-red-600"
                }`}
              >
                {product.availability}
              </p>
            )}
            <p className="text-gray-600 text-sm mt-2 line-clamp-3">
              {product.description}
            </p>
          </div>
        ))}
      </div>
    );
  };

  // Display contact data
  // const renderContactData = () => {
  //   const contact = scrapedData.contact;

  //   if (!contact || Object.keys(contact).length === 0) {
  //     return <p className="text-gray-500">No contact information fetched yet. Enter URLs and click "Fetch Contact Data".</p>;
  //   }

  //   return (
  //     <div className="space-y-3">
  //       {contact.email && (
  //         <div className="flex">
  //           <span className="font-medium w-24">Email:</span>
  //           <span>{contact.email}</span>
  //         </div>
  //       )}
  //       {contact.phone && (
  //         <div className="flex">
  //           <span className="font-medium w-24">Phone:</span>
  //           <span>{contact.phone}</span>
  //         </div>
  //       )}
  //       {contact.address && (
  //         <div className="flex">
  //           <span className="font-medium w-24">Address:</span>
  //           <span>{contact.address}</span>
  //         </div>
  //       )}
  //       {contact.hours && (
  //         <div className="flex">
  //           <span className="font-medium w-24">Hours:</span>
  //           <span>{contact.hours}</span>
  //         </div>
  //       )}
  //       {contact.socialMedia && (
  //         <div className="flex">
  //           <span className="font-medium w-24">Social:</span>
  //           <span>{Array.isArray(contact.socialMedia) ? contact.socialMedia.join(', ') : contact.socialMedia}</span>
  //         </div>
  //       )}
  //     </div>
  //   );
  // };
  const renderContactData = () => {
    const contact = scrapedData.contact;

    if (!contact || Object.keys(contact).length === 0) {
      return (
        <p className="text-gray-500">
          No contact information fetched yet. Enter URLs and click "Fetch
          Contact Data".
        </p>
      );
    }

    return (
      <div className="space-y-3 relative border rounded-lg p-4">
        <div className="absolute top-2 right-2">
          <button
            onClick={() => toggleObjectApproval("contact")}
            className={`px-3 py-1 rounded-full flex items-center justify-center ${
              isObjectApproved("contact")
                ? "bg-green-500 text-white"
                : "bg-gray-200 text-gray-600"
            }`}
            title={
              isObjectApproved("contact") ? "Approved" : "Click to approve"
            }
          >
            {isObjectApproved("contact") ? "Approved ✓" : "Approve"}
          </button>
        </div>

        {contact.email && (
          <div className="flex">
            <span className="font-medium w-24">Email:</span>
            <span>{contact.email}</span>
          </div>
        )}
        {contact.phone && (
          <div className="flex">
            <span className="font-medium w-24">Phone:</span>
            <span>{contact.phone}</span>
          </div>
        )}
        {contact.address && (
          <div className="flex">
            <span className="font-medium w-24">Address:</span>
            <span>{contact.address}</span>
          </div>
        )}
        {contact.hours && (
          <div className="flex">
            <span className="font-medium w-24">Hours:</span>
            <span>{contact.hours}</span>
          </div>
        )}
        {contact.socialMedia && (
          <div className="flex">
            <span className="font-medium w-24">Social:</span>
            <span>
              {Array.isArray(contact.socialMedia)
                ? contact.socialMedia.join(", ")
                : contact.socialMedia}
            </span>
          </div>
        )}
      </div>
    );
  };

  // Display about data
  // const renderAboutData = () => {
  //   if (!scrapedData.about || scrapedData.about === '') {
  //     return <p className="text-gray-500">No about information fetched yet. Enter URLs and click "Fetch About Data".</p>;
  //   }

  //   // If the about data is an object, format it
  //   if (typeof scrapedData.about === 'object') {
  //     const about = scrapedData.about;
  //     return (
  //       <div className="space-y-4">
  //         {about.companyName && (
  //           <div>
  //             <h3 className="font-medium">Company Name</h3>
  //             <p>{about.companyName}</p>
  //           </div>
  //         )}
  //         {about.mission && (
  //           <div>
  //             <h3 className="font-medium">Mission</h3>
  //             <p>{about.mission}</p>
  //           </div>
  //         )}
  //         {about.history && (
  //           <div>
  //             <h3 className="font-medium">History</h3>
  //             <p>{about.history}</p>
  //           </div>
  //         )}
  //         {about.values && (
  //           <div>
  //             <h3 className="font-medium">Values</h3>
  //             <p>{about.values}</p>
  //           </div>
  //         )}
  //         {about.team && (
  //           <div>
  //             <h3 className="font-medium">Team</h3>
  //             <p>{about.team}</p>
  //           </div>
  //         )}
  //       </div>
  //     );
  //   }

  //   // If the about data is a string, just show it
  //   return (
  //     <div className="prose">
  //       <p>{scrapedData.about}</p>
  //     </div>
  //   );
  // };
  //   const renderAboutData = () => {
  //     if (!scrapedData.about || scrapedData.about === '') {
  //       return <p className="text-gray-500">No about information fetched yet. Enter URLs and click "Fetch About Data".</p>;
  //     }

  //     // If the about data is an object, format it
  //     if (typeof scrapedData.about === 'object') {
  //       const about = scrapedData.about;
  //       return (
  //         <div className="space-y-4 relative border rounded-lg p-4">
  //           <div className="absolute top-2 right-2">
  //             <button
  //               onClick={() => toggleObjectApproval('about')}
  //               className={`px-3 py-1 rounded-full flex items-center justify-center ${
  //                 isObjectApproved('about')
  //                   ? 'bg-green-500 text-white'
  //                   : 'bg-gray-200 text-gray-600'
  //               }`}
  //               title={isObjectApproved('about') ? "Approved" : "Click to approve"}
  //             >
  //               {isObjectApproved('about') ? "Approved ✓" : "Approve"}
  //             </button>
  //           </div>

  //           {/* ... rest of about rendering ... */}
  //           {about.companyName && (
  //             <div>
  //               <h3 className="font-medium">Company Name</h3>
  //               <p>{about.companyName}</p>
  //             </div>
  //           )}
  //           {about.mission && (
  //             <div>
  //               <h3 className="font-medium">Mission</h3>
  //               <p>{about.mission}</p>
  //             </div>
  //           )}
  //           {about.history && (
  //             <div>
  //               <h3 className="font-medium">History</h3>
  //               <p>{about.history}</p>
  //             </div>
  //           )}
  //           {about.values && (
  //             <div>
  //               <h3 className="font-medium">Values</h3>
  //               <p>{about.values}</p>
  //             </div>
  //           )}
  //           {about.team && (
  //             <div>
  //               <h3 className="font-medium">Team</h3>
  //               <p>{about.team}</p>
  //             </div>
  //           )}
  //         </div>
  //       );
  //     }

  //     // If the about data is a string, just show it
  //     return (
  //       <div className="prose relative border rounded-lg p-4">
  //         <div className="absolute top-2 right-2">
  //           <button
  //             onClick={() => toggleObjectApproval('about')}
  //             className={`px-3 py-1 rounded-full flex items-center justify-center ${
  //               isObjectApproved('about')
  //                 ? 'bg-green-500 text-white'
  //                 : 'bg-gray-200 text-gray-600'
  //             }`}
  //             title={isObjectApproved('about') ? "Approved" : "Click to approve"}
  //           >
  //             {isObjectApproved('about') ? "Approved ✓" : "Approve"}
  //           </button>
  //         </div>
  //         <p>{scrapedData.about}</p>
  //       </div>
  //     );
  //   };
  // In your renderAboutData function, you need to check if the about data is an object
  // and convert it to a string representation

  // Replace your current renderAboutData function with this one
  const renderAboutData = () => {
    const about = scrapedData.about;

    if (
      !about ||
      (typeof about === "object" && Object.keys(about).length === 0) ||
      about === ""
    ) {
      return (
        <p className="text-gray-500">
          No about information fetched yet. Enter URLs and click "Fetch About
          Data".
        </p>
      );
    }

    // If about is an object, convert it to a readable format
    if (typeof about === "object") {
      return (
        <div className="space-y-3 relative border rounded-lg p-4">
          <div className="absolute top-2 right-2">
            <button
              onClick={() => toggleObjectApproval("about")}
              className={`px-3 py-1 rounded-full flex items-center justify-center ${
                approvedData.about
                  ? "bg-green-500 text-white"
                  : "bg-gray-200 text-gray-600"
              }`}
              title={approvedData.about ? "Approved" : "Click to approve"}
            >
              {approvedData.about ? "Approved ✓" : "Approve"}
            </button>
          </div>

          {Object.entries(about).map(([key, value]) => (
            <div key={key} className="mb-2">
              <h4 className="font-medium capitalize">{key}:</h4>
              <p className="text-gray-700">
                {typeof value === "string" ? value : JSON.stringify(value)}
              </p>
            </div>
          ))}
        </div>
      );
    }

    // If about is a string
    return (
      <div className="relative border rounded-lg p-4">
        <div className="absolute top-2 right-2">
          <button
            onClick={() => toggleObjectApproval("about")}
            className={`px-3 py-1 rounded-full flex items-center justify-center ${
              approvedData.about
                ? "bg-green-500 text-white"
                : "bg-gray-200 text-gray-600"
            }`}
            title={approvedData.about ? "Approved" : "Click to approve"}
          >
            {approvedData.about ? "Approved ✓" : "Approve"}
          </button>
        </div>
        <p className="text-gray-700">{about}</p>
      </div>
    );
  };
  // Display FAQ data
  // const renderFaqData = () => {
  //   if (!scrapedData.faq || scrapedData.faq.length === 0) {
  //     return <p className="text-gray-500">No FAQ information fetched yet. Enter URLs and click "Fetch FAQ Data".</p>;
  //   }

  //   return (
  //     <div className="space-y-4">
  //       {scrapedData.faq.map((item, index) => (
  //         <div key={index} className="border-b pb-4">
  //           <h3 className="font-medium">{item.question}</h3>
  //           <p className="text-gray-600 mt-1">{item.answer}</p>
  //           {item.category && <span className="text-xs text-blue-600 mt-1 inline-block">Category: {item.category}</span>}
  //         </div>
  //       ))}
  //     </div>
  //   );
  // };
  const renderFaqData = () => {
    if (!scrapedData.faq || scrapedData.faq.length === 0) {
      return (
        <p className="text-gray-500">
          No FAQ information fetched yet. Enter URLs and click "Fetch FAQ Data".
        </p>
      );
    }

    return (
      <div className="space-y-4">
        {scrapedData.faq.map((item, index) => (
          <div key={index} className="border-b pb-4 relative">
            <div className="absolute top-0 right-0">
              <button
                onClick={() => toggleApproval("faq", index)}
                className={`w-6 h-6 rounded-full flex items-center justify-center ${
                  isApproved("faq", index)
                    ? "bg-green-500 text-white"
                    : "bg-gray-200 text-gray-600"
                }`}
                title={
                  isApproved("faq", index) ? "Approved" : "Click to approve"
                }
              >
                {isApproved("faq", index) ? "✓" : ""}
              </button>
            </div>
            <h3 className="font-medium pr-8">{item.question}</h3>
            <p className="text-gray-600 mt-1">{item.answer}</p>
            {item.category && (
              <span className="text-xs text-blue-600 mt-1 inline-block">
                Category: {item.category}
              </span>
            )}
          </div>
        ))}
      </div>
    );
  };

  // Display policies data
  // const renderPoliciesData = () => {
  //   if (!scrapedData.policies || scrapedData.policies.length === 0) {
  //     return <p className="text-gray-500">No policies information fetched yet. Enter URLs and click "Fetch Policies Data".</p>;
  //   }

  //   return (
  //     <div className="space-y-6">
  //       {scrapedData.policies.map((policy, index) => (
  //         <div key={index} className="border-b pb-4">
  //           <div className="flex justify-between">
  //             <h3 className="font-medium">{policy.title}</h3>
  //             {policy.lastUpdated && (
  //               <span className="text-xs text-gray-500">Last updated: {policy.lastUpdated}</span>
  //             )}
  //           </div>
  //           <div className="prose mt-2 max-h-60 overflow-y-auto">
  //             <p>{policy.content}</p>
  //           </div>
  //         </div>
  //       ))}
  //     </div>
  //   );
  // };
  const renderPoliciesData = () => {
    if (
      !scrapedData.policies ||
      !Array.isArray(scrapedData.policies) ||
      scrapedData.policies.length === 0
    ) {
      return (
        <p className="text-gray-500">
          No policies information fetched yet. Enter URLs and click "Fetch
          Policies Data".
        </p>
      );
    }

    return (
      <div className="space-y-6">
        {scrapedData.policies.map((policy, index) => {
          // Check if policy is null or undefined before accessing properties
          if (!policy) return null;

          return (
            <div key={index} className="border-b pb-4 relative">
              <div className="absolute top-0 right-0">
                <button
                  onClick={() => toggleApproval("policies", index)}
                  className={`w-6 h-6 rounded-full flex items-center justify-center ${
                    isApproved("policies", index)
                      ? "bg-green-500 text-white"
                      : "bg-gray-200 text-gray-600"
                  }`}
                  title={
                    isApproved("policies", index)
                      ? "Approved"
                      : "Click to approve"
                  }
                >
                  {isApproved("policies", index) ? "✓" : ""}
                </button>
              </div>
              <div className="flex justify-between pr-8">
                <h3 className="font-medium">
                  {policy.title || "Untitled Policy"}
                </h3>
                {policy.lastUpdated && (
                  <span className="text-xs text-gray-500">
                    Last updated: {policy.lastUpdated}
                  </span>
                )}
              </div>
              <div className="prose mt-2 max-h-60 overflow-y-auto">
                <p>{policy.content || "No content available"}</p>
              </div>
            </div>
          );
        })}
      </div>
    );
  };
  // Rendering UI components for each step
  const renderStepContent = () => {
    switch (currentStep) {
      case 1:
        return (
          <div className="space-y-6">
            <h2 className="text-xl font-bold">Step 1: Product Information</h2>
            <p className="text-gray-600">
              Enter URLs where your products are listed. We'll extract product
              details for your chatbot.
            </p>

            <div className="space-y-4">
              <UrlInputGroup type="products" urls={urlFields.products} />

              <button
                onClick={() => handleScrape("products")}
                disabled={loading}
                className="w-full px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-opacity-50 disabled:opacity-50"
              >
                {loading ? "Fetching..." : "Fetch Product Data"}
              </button>

              {error && <div className="text-red-500 text-sm">{error}</div>}

              <div className="border rounded-lg p-4 bg-gray-50">
                <h3 className="font-medium mb-2">Scraped Products</h3>
                {renderProductData()}
              </div>
            </div>
          </div>
        );

      case 2:
        return (
          <div className="space-y-6">
            <h2 className="text-xl font-bold">Step 2: Contact Information</h2>
            <p className="text-gray-600">
              Enter URLs of your contact pages. We'll extract phone numbers,
              email addresses, and other contact details.
            </p>

            <div className="space-y-4">
              <UrlInputGroup type="contact" urls={urlFields.contact} />

              <button
                onClick={() => handleScrape("contact")}
                disabled={loading}
                className="w-full px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-opacity-50 disabled:opacity-50"
              >
                {loading ? "Fetching..." : "Fetch Contact Data"}
              </button>

              {error && <div className="text-red-500 text-sm">{error}</div>}

              <div className="border rounded-lg p-4 bg-gray-50">
                <h3 className="font-medium mb-2">
                  Scraped Contact Information
                </h3>
                {renderContactData()}
              </div>
            </div>
          </div>
        );

      case 3:
        return (
          <div className="space-y-6">
            <h2 className="text-xl font-bold">Step 3: About Information</h2>
            <p className="text-gray-600">
              Enter URLs of your about pages. We'll extract company information
              and history.
            </p>

            <div className="space-y-4">
              <UrlInputGroup type="about" urls={urlFields.about} />

              <button
                onClick={() => handleScrape("about")}
                disabled={loading}
                className="w-full px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-opacity-50 disabled:opacity-50"
              >
                {loading ? "Fetching..." : "Fetch About Data"}
              </button>

              {error && <div className="text-red-500 text-sm">{error}</div>}

              <div className="border rounded-lg p-4 bg-gray-50">
                <h3 className="font-medium mb-2">Scraped About Information</h3>
                {renderAboutData()}
              </div>
            </div>
          </div>
        );

      case 4:
        return (
          <div className="space-y-6">
            <h2 className="text-xl font-bold">Step 4: FAQ Information</h2>
            <p className="text-gray-600">
              Enter URLs of your FAQ pages. We'll extract questions and answers
              for your chatbot.
            </p>

            <div className="space-y-4">
              <UrlInputGroup type="faq" urls={urlFields.faq} />

              <button
                onClick={() => handleScrape("faq")}
                disabled={loading}
                className="w-full px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-opacity-50 disabled:opacity-50"
              >
                {loading ? "Fetching..." : "Fetch FAQ Data"}
              </button>

              {error && <div className="text-red-500 text-sm">{error}</div>}

              <div className="border rounded-lg p-4 bg-gray-50">
                <h3 className="font-medium mb-2">Scraped FAQ Information</h3>
                {renderFaqData()}
              </div>
            </div>
          </div>
        );

      case 5:
        return (
          <div className="space-y-6">
            <h2 className="text-xl font-bold">Step 5: Policies Information</h2>
            <p className="text-gray-600">
              Enter URLs of your policy pages. We'll extract privacy policies,
              terms of service, and other policies.
            </p>

            <div className="space-y-4">
              <UrlInputGroup type="policies" urls={urlFields.policies} />

              <button
                onClick={() => handleScrape("policies")}
                disabled={loading}
                className="w-full px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-opacity-50 disabled:opacity-50"
              >
                {loading ? "Fetching..." : "Fetch Policies Data"}
              </button>

              {error && <div className="text-red-500 text-sm">{error}</div>}

              <div className="border rounded-lg p-4 bg-gray-50">
                <h3 className="font-medium mb-2">
                  Scraped Policies Information
                </h3>
                {renderPoliciesData()}
              </div>
            </div>
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <div className="max-w-4xl mx-auto py-8 px-4">
      <h1 className="text-2xl font-bold mb-6">Website Data Scraper</h1>

      {/* Progress indicator */}
      <div className="flex justify-between mb-8">
        {[1, 2, 3, 4, 5].map((step) => (
          <button
            key={step}
            onClick={() => setCurrentStep(step)}
            className={`w-10 h-10 rounded-full flex items-center justify-center ${
              currentStep === step
                ? "bg-blue-600 text-white"
                : currentStep > step
                ? "bg-blue-100 text-blue-600"
                : "bg-gray-200 text-gray-600"
            }`}
          >
            {step}
          </button>
        ))}
      </div>

      {/* Step content */}
      {renderStepContent()}

      {/* Navigation buttons */}
      <div className="flex justify-between mt-8">
        <button
          onClick={prevStep}
          disabled={currentStep === 1}
          className="px-4 py-2 border rounded-lg hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-opacity-50 disabled:opacity-50"
        >
          Previous Step
        </button>

        <button
          onClick={nextStep}
          disabled={currentStep === 5}
          className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-opacity-50 disabled:opacity-50"
        >
          Next Step
        </button>
      </div>

      {/* Export button (only shown on the last step) */}
      {currentStep === 5 && (
        <div className="mt-8 space-y-4">
          <button
            onClick={() => {
              const dataStr = JSON.stringify(scrapedData, null, 2);
              const dataUri = `data:application/json;charset=utf-8,${encodeURIComponent(
                dataStr
              )}`;

              const exportFileDefaultName = "scraped-website-data.json";

              const linkElement = document.createElement("a");
              linkElement.setAttribute("href", dataUri);
              linkElement.setAttribute("download", exportFileDefaultName);
              linkElement.click();
            }}
            className="w-full px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-opacity-50"
          >
            Export All Data as JSON
          </button>

          <button
            onClick={saveToSupabase}
            disabled={savingToDb}
            className="w-full px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-opacity-50 disabled:opacity-50"
          >
            {savingToDb ? "Saving..." : "Save Approved Data to Database"}
          </button>
          <p className="text-sm text-gray-600 mt-2">
            Remember to approve data by clicking the checkmarks before saving.
            Only approved data will be saved to the database.
          </p>
          {saveSuccess && (
            <div className="bg-green-50 border-l-4 border-green-500 p-4">
              <div className="flex">
                <div className="flex-shrink-0">
                  <svg
                    className="h-5 w-5 text-green-500"
                    xmlns="http://www.w3.org/2000/svg"
                    viewBox="0 0 20 20"
                    fill="currentColor"
                  >
                    <path
                      fillRule="evenodd"
                      d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                      clipRule="evenodd"
                    />
                  </svg>
                </div>
                <div className="ml-3">
                  <p className="text-sm text-green-700">{saveSuccess}</p>
                </div>
              </div>
            </div>
          )}

          <div className="bg-blue-50 border-l-4 border-blue-500 p-4">
            <div className="flex">
              <div className="flex-shrink-0">
                <svg
                  className="h-5 w-5 text-blue-500"
                  xmlns="http://www.w3.org/2000/svg"
                  viewBox="0 0 20 20"
                  fill="currentColor"
                >
                  <path
                    fillRule="evenodd"
                    d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2h-1V9a1 1 0 00-1-1z"
                    clipRule="evenodd"
                  />
                </svg>
              </div>
              <div className="ml-3">
                <p className="text-sm text-blue-700">
                  Click the checkmarks or approve buttons to select which data
                  you want to save to the database. Only approved data will be
                  saved when you click "Save Approved Data to Database".
                </p>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default WebsiteDataScraper;
