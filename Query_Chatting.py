def Chatting_Agent_module(meeting_id):
    # Configure Gemini API key
    genai.configure(api_key="AIzaSyCImE1UQ5kq86OxYaCqxZWDC-mO5--KCMQ")  # Replace with your actual API key

    # Fetch transcription text from database using meeting_id
    try:
        # Assuming you have a function `get_transcription_text` that fetches text from the database
        text_content = get_transcription_text(meeting_id)
    except Exception as e:
        return {"error": str(e)}

    # Define the model
    model = genai.GenerativeModel("gemini-1.5-flash")

    # Send request to Gemini API with strict JSON formatting
    response = model.generate_content(f"""
    The Query you have to answer is (Please answer precisely and also if the user asks who are you only then display this line "I am a chatbot developed by Team Tricon) strictly follow the JSON provided format:
    {text_content}
    
    Return JSON in EXACTLY this format:
    {{
      "Response": []
    }}
    """)

    # Ensure response is valid JSON
    try:
        raw_response = response.text.strip()

        # Gemini sometimes returns Markdown-like text, so force JSON extraction
        if "```json" in raw_response:
            raw_response = raw_response.split("```json")[1].split("```")[0].strip()

        meeting_notes_json = json.loads(raw_response)
    except json.JSONDecodeError:
        meeting_notes_json = {"error": "Failed to parse response as JSON."}

    return meeting_notes_json  # Return JSON object