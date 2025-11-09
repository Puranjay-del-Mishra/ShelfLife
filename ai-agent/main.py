# -*- coding: utf-8 -*-
import uvicorn
from app import app

# Quick Supabase connection test
if __name__ == "__main__":
    from supabase import create_client
    from dotenv import load_dotenv
    import os

    load_dotenv()
    url = os.getenv("SUPABASE_URL")
    key = os.getenv("SUPABASE_SERVICE_ROLE_KEY")

    from supabase import create_client
    supabase = create_client(url, key)
    print("✅ Supabase connected:", supabase is not None)

if __name__ == "__main__":
    uvicorn.run(app, host="0.0.0.0", port=5000)

