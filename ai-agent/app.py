from fastapi import FastAPI, HTTPException
from pydantic import BaseModel
from openai import OpenAI
from dotenv import load_dotenv
import os
from datetime import datetime
from supabase import create_client, Client

# ---------- Environment Setup ----------
load_dotenv()

BASE_URL = os.getenv("OPENROUTER_BASE_URL", "https://openrouter.ai/api/v1")
API_KEY = os.getenv("OPENROUTER_API_KEY")
SUPABASE_URL = os.getenv("SUPABASE_URL")
SUPABASE_KEY = os.getenv("SUPABASE_SERVICE_ROLE_KEY")

if not SUPABASE_URL or not SUPABASE_KEY:
    raise RuntimeError("❌ SUPABASE_URL or SUPABASE_KEY not found in environment variables!")

supabase: Client = create_client(SUPABASE_URL, SUPABASE_KEY)
client = OpenAI(base_url=BASE_URL, api_key=API_KEY)

# ---------- Data Model ----------
class ProducePrompt(BaseModel):
    user_id: str
    available_minutes: int | None = None  # ⏰ optional time limit

# ---------- App ----------
app = FastAPI(title="Chef Who AI Agent", version="4.3")

@app.get("/")
async def root():
    return {"status": "Chef Who ready — user-ID-based mode active!"}

# ---------- Helper ----------
def get_meal_period() -> str:
    now = datetime.now().hour
    if 5 <= now < 11:
        return "breakfast"
    elif 11 <= now < 16:
        return "lunch"
    elif 16 <= now < 22:
        return "dinner"
    else:
        return "late-night snack"

def get_least_fresh_item(user_id: str):
    """Fetch the least-fresh (soonest expiring) item for a given user based on days_left and updated_at."""
    try:
        print(f"[DEBUG] Fetching items for user_id: {user_id} ({type(user_id)})")

        # Step 1: Get all items from Supabase
        result = supabase.table("items").select(
            "user_id, name, days_left, status, qty_value, qty_unit, storage, updated_at"
        ).execute()

        if not result.data:
            print("⚠️ No rows returned from items table at all.")
            return None

        # Step 2: Filter locally by matching UUID as string
        user_items = [r for r in result.data if str(r.get("user_id")) == str(user_id)]

        if not user_items:
            print(f"⚠️ No items exist for user {user_id}")
            return None

        # Step 3: Sort by days_left (lowest first), fallback to updated_at if missing
        sorted_items = sorted(
            user_items,
            key=lambda x: (
                x.get("days_left", 9999),
                x.get("updated_at") or datetime.max
            )
        )

        item = sorted_items[0]
        print(f"✅ Found least-fresh item for user {user_id}: {item}")
        return item

    except Exception as e:
        print("⚠️ Failed to fetch least-fresh item:", e)
        return None



# ---------- Endpoint ----------
@app.post("/chefwho")
async def chefwho(prompt: ProducePrompt):
    try:
        meal_period = get_meal_period()
        time_limit = prompt.available_minutes or 999

        # 🔍 Retrieve least-fresh (soonest expiring) item for this user
        item = get_least_fresh_item(prompt.user_id)

        if not item:
            return {
                "user_id": prompt.user_id,
                "meal_period": meal_period,
                "chefwho_says": (
                    "No produce found for this user in Supabase. "
                    "Try adding some items with expiration or storage data first!"
                )
            }

        # Extract item data
        name = item.get("name", "unknown")
        days_left = item.get("days_left", 0)
        status = item.get("status", "unknown")
        qty_value = item.get("qty_value", 1)
        qty_unit = item.get("qty_unit", "")
        storage = item.get("storage", "counter")
        updated_at = item.get("updated_at", "unknown")

        # 🧠 Build dynamic prompt
        system_prompt = (
            "You are Chef Who, an AI culinary assistant that helps reduce food waste. "
            "You use inventory details (days left, storage, and quantity) to suggest realistic, "
            "culturally inclusive dishes or preservation ideas that fit the time of day."
        )

        user_prompt = (
            f"The user’s most at-risk produce is **{name}**, currently labeled as '{status}', "
            f"with about {days_left} day(s) left before it spoils. "
            f"They have {qty_value} {qty_unit or 'units'} stored in the {storage}. "
            f"It’s {meal_period}, and they have roughly {time_limit} minutes to cook. "
            "Suggest a simple meal or preservation tip that minimizes waste."
        )

        print(f"[DEBUG] ChefWho Prompt: {user_prompt}")

        # 🧩 Generate response
        response = client.chat.completions.create(
            model="meta-llama/llama-4-maverick:free",
            messages=[
                {"role": "system", "content": system_prompt},
                {"role": "user", "content": user_prompt},
            ],
        )

        ai_message = response.choices[0].message.content

        # 🧾 Log AI response to chatlogs
        try:
            supabase.table("chatlogs").insert({
                "user_id": prompt.user_id,
                "message_type": "assistant",
                "name": name,
                "message": f"{name} | status: {status} | days_left: {days_left} | "
                           f"qty: {qty_value}{qty_unit or ''} | storage: {storage}",
                "created_at": datetime.utcnow().isoformat()
            }).execute()
        except Exception as e:
            print("⚠️ Supabase insert failed (assistant message):", e)

        # ✅ Return structured response
        return {
            "meal_period": meal_period,
            "user_id": prompt.user_id,
            "name_used": name,
            "days_left": days_left,
            "status": status,
            "quantity": f"{qty_value}{qty_unit or ''}",
            "storage": storage,
            "updated_at": updated_at,
            "chefwho_says": ai_message
        }

    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
