import json
import sys
import os
from dotenv import load_dotenv
import traceback

# Load environment variables
load_dotenv()

def process_chat_query(query, website_data):
    """Process a chat query using the LLM and return a response."""
    try:
        # Set the API key for Gemini
        api_key = os.environ.get("GEMINI_API_KEY") or "AIzaSyDmTQWxYav1L1My6Fz-VxXLSTCA5lR0La8"
        if not api_key:
            print("Missing API key", file=sys.stderr)
            return {
                "error": "Missing API key. Please set the GEMINI_API_KEY environment variable.",
                "response": "I'm sorry, I couldn't access my knowledge base at the moment."
            }
        
        os.environ["GEMINI_API_KEY"] = api_key
        
        try:
            from litellm import completion
        except ImportError:
            print("Error importing litellm. Make sure it's installed.", file=sys.stderr)
            return {
                "error": "Missing required package: litellm",
                "response": "I'm sorry, I couldn't access my knowledge base at the moment."
            }
        
        print(f"Processing query: {query}", file=sys.stderr)
        print(f"Website data sections: {list(website_data.keys())}", file=sys.stderr)
        
        # Create a system message that instructs the LLM how to respond
        system_message = """You are a helpful customer service chatbot for a website. 
        You have access to the website's data and should use it to answer user questions accurately.
        Be conversational, helpful, and concise. If you don't know the answer, say so honestly.
        Base your answers ONLY on the provided website data."""
        
        # Format the website data for better context
        formatted_data = format_website_data(website_data)
        
        # Create a user message that includes both the query and the formatted website data
        user_message = f"""
        User query: {query}
        
        Website data:
        {formatted_data}
        
        Please respond to the user query based ONLY on the website data provided above.
        """
        
        # Build the conversation messages
        messages = [
            {"role": "system", "content": system_message},
            {"role": "user", "content": user_message}
        ]

        # Prepare parameters for the LiteLLM completion call
        params = {
            "model": "gemini/gemini-2.0-flash",
            "messages": messages,
            "temperature": 0.5,
            "max_tokens": 1000,
        }
        
        print("Calling LLM API...", file=sys.stderr)
        # Call the LLM using LiteLLM
        response = completion(**params)
        
        # Extract the response content
        response_text = response.choices[0].message.content
        print(f"LLM response received: {response_text[:100]}...", file=sys.stderr)
        
        return {
            "response": response_text
        }
        
    except Exception as e:
        print(f"Error calling LLM: {e}", file=sys.stderr)
        print(traceback.format_exc(), file=sys.stderr)
        return {
            "error": f"Error calling LLM: {str(e)}",
            "response": "I'm sorry, I encountered an error while processing your request."
        }

def format_website_data(data):
    """Format the website data in a more structured way for better context."""
    formatted = []
    
    # Format products
    if data.get('products') and len(data['products']) > 0:
        formatted.append("PRODUCTS:")
        for i, product in enumerate(data['products'][:10]):  # Limit to 10 products to avoid token limits
            product_info = []
            if product.get('name'):
                product_info.append(f"Name: {product['name']}")
            if product.get('price'):
                product_info.append(f"Price: {product['price']}")
            if product.get('description'):
                product_info.append(f"Description: {product['description'][:200]}...")
            formatted.append(f"Product {i+1}: {' | '.join(product_info)}")
        
        if len(data['products']) > 10:
            formatted.append(f"(+ {len(data['products']) - 10} more products)")
    
    # Format contact information
    if data.get('contact') and isinstance(data['contact'], dict):
        formatted.append("\nCONTACT INFORMATION:")
        for key, value in data['contact'].items():
            if value:
                formatted.append(f"{key.capitalize()}: {value}")
    
    # Format about information
    if data.get('about'):
        formatted.append("\nABOUT THE COMPANY:")
        if isinstance(data['about'], dict):
            for key, value in data['about'].items():
                if value:
                    formatted.append(f"{key.capitalize()}: {value}")
        else:
            formatted.append(str(data['about']))
    
    # Format FAQs
    if data.get('faq') and len(data['faq']) > 0:
        formatted.append("\nFREQUENTLY ASKED QUESTIONS:")
        for i, faq in enumerate(data['faq'][:10]):  # Limit to 10 FAQs
            if faq.get('question') and faq.get('answer'):
                formatted.append(f"Q{i+1}: {faq['question']}")
                formatted.append(f"A{i+1}: {faq['answer']}")
        
        if len(data['faq']) > 10:
            formatted.append(f"(+ {len(data['faq']) - 10} more FAQs)")
    
    # Format policies
    if data.get('policies') and len(data['policies']) > 0:
        formatted.append("\nPOLICIES:")
        for i, policy in enumerate(data['policies']):
            if policy.get('title'):
                policy_content = policy.get('content', '')[:200]
                formatted.append(f"Policy: {policy['title']}")
                if policy_content:
                    formatted.append(f"Content: {policy_content}...")
    
    return "\n".join(formatted)

if __name__ == "__main__":
    if len(sys.argv) < 2:
        print(json.dumps({"error": "Missing arguments", "response": "Error processing your request."}))
        sys.exit(1)
    
    try:
        # Parse the input JSON
        input_data = json.loads(sys.argv[1])
        query = input_data.get('query', '')
        website_data = input_data.get('websiteData', {})
        
        if not query or not website_data:
            print(json.dumps({"error": "Missing query or website data", "response": "Error processing your request."}))
            sys.exit(1)
            
        result = process_chat_query(query, website_data)
        print(json.dumps(result, ensure_ascii=False))
        
    except json.JSONDecodeError:
        print(json.dumps({"error": "Invalid JSON data", "response": "Error processing your request."}))
        sys.exit(1)
    except Exception as e:
        print(json.dumps({"error": str(e), "response": "An unexpected error occurred."}))
        sys.exit(1)