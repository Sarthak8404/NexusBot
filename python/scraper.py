import json
import asyncio
import sys
import io
import os
import sys
from crawl4ai import AsyncWebCrawler
from litellm import completion, token_counter, completion_cost
from dotenv import load_dotenv
load_dotenv()
# Set up stdout with UTF-8 encoding
sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8')

# Dynamic system and user messages based on content type
def get_messages(content_type, fields):
    """Get appropriate messages based on the content type."""
    
    # Same function body as original
    system_message = """You are an intelligent web data extraction specialist. Your task is to extract structured information 
                      from the given webpage content and convert it into a clean JSON format. The JSON should contain only 
                      the structured data extracted from the text. If the information is in a foreign language, please extract 
                      it in that language. Be thorough and precise. Find as many relevant data points as possible."""
    
    prompt_templates = {
        "products": """Extract product information from the provided webpage content. For each product you find, include:
- name: The product name (required)
- description: A brief description of the product (required)
- price: The price with currency symbol if available (required)
- imageUrl: The URL of the product image if available
- availability: Whether the product is in stock, out of stock, etc.
- category: Product category if available

Format the output as a JSON array of product objects. Include as many products as you can find on the page.
If you can't find specific information for a field, use an empty string.

Page content:
""",
        
        "contact": """Extract contact information from the provided webpage content, including:
- email: All email addresses found
- phone: All phone numbers found
- address: Physical address(es) if available (full address including city, state, zip code)
- hours: Business hours if available
- socialMedia: Links to social media profiles

Format the output as a JSON object with these fields.
If you can't find specific information for a field, use an empty string or empty array as appropriate.

Page content:
""",
        
        "about": """Extract company information from the provided webpage content, including:
- companyName: The name of the company or organization
- history: Information about the company's history or founding
- mission: The company's mission statement or purpose
- team: Information about team members or leadership
- values: The company's values or principles

Format the output as a JSON object with these fields.
Include as much detailed information as possible for each field.
If you can't find specific information for a field, use an empty string.

Page content:
""",
        
        "faq": """Extract frequently asked questions and their answers from the provided webpage content.
For each FAQ item you find, include:
- question: The question text
- answer: The complete answer text
- category: The category of the question if available

Format the output as a JSON array of FAQ objects.
Include as many FAQ items as you can find on the page.
If you can't find specific information for a field, use an empty string.

Page content:
""",
        
        "policies": """Extract policy information from the provided webpage content.
For each policy document or section you find, include:
- title: The title or name of the policy (e.g., "Privacy Policy", "Terms of Service")
- content: The full content of the policy
- lastUpdated: The date when the policy was last updated (if available)

Format the output as a JSON array of policy objects.
Include as many policies as you can find on the page.
If you can't find specific information for a field, use an empty string.

Page content:
"""
    }
    
    # Use the appropriate template or a default one
    user_message = prompt_templates.get(content_type, 
                   f"""Extract the following information from the provided webpage content: {fields}
                   
                   Format the output as a clean JSON object or array of objects, depending on the content.
                   If you can't find specific information for a field, use an empty string.
                   
                   Page content:
                   """)
    
    return system_message, user_message

# Function to fetch markdown content from a URL
# Function to fetch markdown content from a URL
# Make sure crawl4ai logs go to stderr
async def get_markdown_async(url: str) -> str:
    """Fetch the markdown content from the given URL."""
    async with AsyncWebCrawler() as crawler:
        # Redirect all crawler logs to stderr
        try:
            result = await crawler.arun(url=url)
            if result.success:
                return result.markdown
            else:
                print(f"Failed to fetch content from {url}", file=sys.stderr)
                return ""
        except Exception as e:
            print(f"Error during crawling: {str(e)}", file=sys.stderr)
            return ""
# In scraper.py
# print("JSON_DATA_START", file=sys.stdout)
# print(json.dumps(result, ensure_ascii=False), file=sys.stdout)
# print("JSON_DATA_END", file=sys.stdout)
# Function to clean the extracted data
def clean_data(data, content_type):
    """Clean and format the scraped data based on content type."""
    if isinstance(data, list):
        cleaned_data = []
        for item in data:
            cleaned_item = {}
            for key, value in item.items():
                if isinstance(value, str):
                    # Remove extra whitespace and newlines
                    cleaned_item[key] = ' '.join(value.split())
                else:
                    cleaned_item[key] = value
            cleaned_data.append(cleaned_item)
        return cleaned_data
    elif isinstance(data, dict):
        cleaned_data = {}
        for key, value in data.items():
            if isinstance(value, str):
                cleaned_data[key] = ' '.join(value.split())
            else:
                cleaned_data[key] = value
        return cleaned_data
    else:
        return data

def call_llm_model(data, content_type, fields):
    """
    Calls the Gemini 1.5 Flash model via LiteLLM and returns structured data.
    """
    try:
        # Set the API key for Gemini (ideally use environment variables)
        api_key = os.environ.get("GEMINI_API_KEY")
        if not api_key:
            # If no API key is available, return a meaningful error
            print("Error: No GEMINI_API_KEY found in environment variables.", file=sys.stderr)
            return {
                "error": "Missing API key. Please set the GEMINI_API_KEY environment variable.",
                "content": ""
            }, None, None
        
        os.environ["GEMINI_API_KEY"] = api_key
        
        # Get the appropriate messages
        system_message, user_message = get_messages(content_type, fields)
        
        # Build the conversation messages
        messages = [
            {"role": "system", "content": system_message},
            {"role": "user", "content": f"{user_message} {data[:10000]}"}  # Limit content length
        ]

        # Prepare parameters for the LiteLLM completion call
        params = {
            "model": "gemini/gemini-2.0-flash",
            "messages": messages,
            "temperature": 0.2,  # Lower temperature for more consistent extraction
            "max_tokens": 8000,  # Allow enough tokens for comprehensive extraction
        }

        print(f"Calling LLM with content type: {content_type}", file=sys.stderr)
        
        # Call the LLM using LiteLLM
        response = completion(**params)

        # Extract the parsed response
        parsed_response = response.choices[0].message.content
        print(f"Received response from LLM", file=sys.stderr)

        # Calculate token counts
        input_tokens = token_counter(model="gemini/gemini-1.5-flash", messages=messages)
        output_text = parsed_response if isinstance(parsed_response, str) else json.dumps(parsed_response)
        output_tokens = token_counter(model="gemini/gemini-1.5-flash", text=output_text)

        token_counts = {
            "input_tokens": input_tokens,
            "output_tokens": output_tokens,
        }

        # Calculate the total cost for the request
        cost = completion_cost(completion_response=response)
        
        # Try to parse the response as JSON
        try:
            # Check if the response contains a JSON string
            if isinstance(parsed_response, str):
                # First, check if there's JSON inside markdown code blocks
                if "```json" in parsed_response:
                    json_parts = parsed_response.split("```json")
                    if len(json_parts) > 1:
                        json_content = json_parts[1].split("```")[0].strip()
                        parsed_data = json.loads(json_content)
                else:
                    # Try to find standard JSON markers
                    start_idx = parsed_response.find('{')
                    end_idx = parsed_response.rfind('}') + 1
                    if start_idx == -1 or end_idx == 0:
                        # Try array format
                        start_idx = parsed_response.find('[')
                        end_idx = parsed_response.rfind(']') + 1
                    
                    if start_idx >= 0 and end_idx > 0:
                        json_str = parsed_response[start_idx:end_idx]
                        parsed_data = json.loads(json_str)
                    else:
                        # If no JSON found, create a simple structure
                        parsed_data = {"content": parsed_response[:500]}
            else:
                parsed_data = parsed_response
                
            return parsed_data, token_counts, cost
        except json.JSONDecodeError as e:
            print(f"JSON decode error: {e}", file=sys.stderr)
            # Create a fallback structure with truncated content
            if content_type == "products":
                fallback_data = [{"name": "Product", "description": parsed_response[:300], "price": ""}]
            elif content_type == "about":
                fallback_data = {"companyName": "Unknown", "history": parsed_response[:500]}
            elif content_type == "contact":
                fallback_data = {"email": "", "phone": "", "info": parsed_response[:500]}
            elif content_type == "faq":
                fallback_data = [{"question": "FAQ", "answer": parsed_response[:500]}]
            elif content_type == "policies":
                fallback_data = [{"title": "Policy", "content": parsed_response[:500]}]
            else:
                fallback_data = {"content": parsed_response[:500]}
                
            return fallback_data, token_counts, cost
            
    except Exception as e:
        import traceback
        print(f"Error calling LLM: {e}", file=sys.stderr)
        print(traceback.format_exc(), file=sys.stderr)
        # Return a meaningful error structure
        return {"error": f"Error calling LLM: {str(e)}", "content": ""}, None, None
def extract_json_from_markdown(response_text):
    import re
    import json

    # Try to extract JSON from markdown code blocks
    code_block_pattern = r"```(?:json)?(.*?)```"
    code_blocks = re.findall(code_block_pattern, response_text, re.DOTALL)

    if code_blocks:
        for block in code_blocks:
            try:
                clean_block = block.strip()
                return json.loads(clean_block)
            except json.JSONDecodeError:
                continue

    # If no code block found, try to find JSON directly
    try:
        start_idx = response_text.find('{')
        end_idx = response_text.rfind('}') + 1
        if start_idx >= 0 and end_idx > 0:
            json_str = response_text[start_idx:end_idx]
            return json.loads(json_str)
    except json.JSONDecodeError:
        pass

    return None
# Main function to scrape and extract data
async def scrape_and_extract(url: str, fields: list, content_type: str):
    """Scrape the URL and extract structured data using an LLM."""
    # Fetch the markdown content
    markdown_content = await get_markdown_async(url)
    if not markdown_content:
        return {"error": "Failed to fetch content", "url": url, "data": []}

    # Call the LLM to extract structured data
    parsed_data, token_counts, cost = call_llm_model(markdown_content, content_type, fields)

    if isinstance(parsed_data, dict) and "error" in parsed_data:
        return {"error": parsed_data["error"], "url": url, "data": []}

    # Clean the extracted data
    if content_type in ["products", "faq", "policies"]:
        # For these types, expect an array of items
        if isinstance(parsed_data, dict) and "listings" in parsed_data:
            cleaned_data = clean_data(parsed_data.get("listings", []), content_type)
        elif isinstance(parsed_data, list):
            cleaned_data = clean_data(parsed_data, content_type)
        else:
            # Try to wrap in an array if it's a single item
            cleaned_data = clean_data([parsed_data] if isinstance(parsed_data, dict) else [], content_type)
    else:
        # For contact and about, expect a single object
        if isinstance(parsed_data, list) and len(parsed_data) > 0:
            cleaned_data = clean_data(parsed_data[0], content_type)
        else:
            cleaned_data = clean_data(parsed_data, content_type)

    # Prepare the output
    output = {
        "url": url,
        "input_tokens": token_counts["input_tokens"] if token_counts else 0,
        "output_tokens": token_counts["output_tokens"] if token_counts else 0,
        "cost": cost if cost else 0,
        "data": cleaned_data
    }

    return output

def extract_json_from_llm_response(response_text):
    """
    Extracts valid JSON from LLM response text which may contain markdown formatting
    or other non-JSON content.
    """
    import re
    import json
    
    # Method 1: Extract from markdown code blocks
    code_block_pattern = r"```(?:json)?(.*?)```"
    code_blocks = re.findall(code_block_pattern, response_text, re.DOTALL)
    
    if code_blocks:
        for block in code_blocks:
            try:
                # Clean up the block and try to parse as JSON
                clean_block = block.strip()
                return json.loads(clean_block)
            except json.JSONDecodeError:
                continue
    
    # Method 2: Try to find JSON array or object
    try:
        # First try to find a JSON array
        array_match = re.search(r"\[(.*)\]", response_text, re.DOTALL)
        if array_match:
            return json.loads(array_match.group(0))
        
        # Then try to find a JSON object
        object_match = re.search(r"\{(.*)\}", response_text, re.DOTALL)
        if object_match:
            return json.loads(object_match.group(0))
    except json.JSONDecodeError:
        pass
    
    # Method 3: Build structured data from unstructured text (fallback)
    if "products" in response_text.lower() or "price" in response_text.lower():
        # Try to build a simple product list
        return [{"name": "Product from unstructured text", 
                 "description": response_text[:500], 
                 "price": "Unknown"}]
    
    # Last resort fallback
    return {"content": response_text[:1000]}

async def main():
    """Main function to handle a single URL."""
    try:
        if len(sys.argv) < 3:
            print("Usage: python scraper.py <url> <fields> [content_type]", file=sys.stderr)
            print('Example: python scraper.py "https://example.com/" "name,price,description" "products"', file=sys.stderr)
            sys.exit(1)
        
        url = sys.argv[1]
        fields = sys.argv[2].split(",")
        content_type = sys.argv[3] if len(sys.argv) > 3 else "general"
        
        # Print logs only to stderr
        print(f"Starting scrape for URL: {url}, fields: {fields}, type: {content_type}", file=sys.stderr)
        
        try:
            result = await scrape_and_extract(url, fields, content_type)
            
            # Print ONLY the clean JSON result to stdout for parsing by Node.js
            sys.stdout.write(json.dumps(result, ensure_ascii=False))
            sys.stdout.flush()
            
        except Exception as e:
            import traceback
            # Print traceback to stderr for debugging
            print(f"Error in scrape_and_extract: {str(e)}", file=sys.stderr)
            print(traceback.format_exc(), file=sys.stderr)
            
            error_data = {
                "url": url,
                "error": str(e),
                "data": []
            }
            # Print only the JSON error to stdout
            sys.stdout.write(json.dumps(error_data, ensure_ascii=False))
            sys.stdout.flush()
        
    except Exception as e:
        import traceback
        # Print traceback to stderr for debugging
        print(f"Error in main function: {str(e)}", file=sys.stderr)
        print(traceback.format_exc(), file=sys.stderr)
        
        error_data = {
            "url": sys.argv[1] if len(sys.argv) > 1 else "unknown",
            "error": str(e),
            "data": []
        }
        # Print only the JSON error to stdout
        sys.stdout.write(json.dumps(error_data, ensure_ascii=False))
        sys.stdout.flush()
if __name__ == "__main__":
    asyncio.run(main())
