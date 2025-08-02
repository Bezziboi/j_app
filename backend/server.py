from fastapi import FastAPI, APIRouter, HTTPException
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
import os
import logging
from pathlib import Path
from pydantic import BaseModel, Field
from typing import List, Optional
import uuid
from datetime import datetime, date


ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

# MongoDB connection
mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ['DB_NAME']]

# Create the main app without a prefix
app = FastAPI()

# Create a router with the /api prefix
api_router = APIRouter(prefix="/api")


# Define Models
class ExpenseItem(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    title: str
    amount: float

class DailyReport(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    date: str  # YYYY-MM-DD format
    pos_profit: float
    employee_payout: float = 650.0
    government_expense: float = 200.0
    product_expenses: List[ExpenseItem] = []
    other_expenses: List[ExpenseItem] = []
    total_expenses: float = 0.0
    cash_in_register: float = 0.0
    remaining_balance: float = 0.0
    excess: float = 0.0
    created_by: str = "user"
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)

class DailyReportCreate(BaseModel):
    date: str
    pos_profit: float
    employee_payout: float = 650.0
    government_expense: float = 200.0
    product_expenses: List[ExpenseItem] = []
    other_expenses: List[ExpenseItem] = []
    created_by: str = "user"

class User(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    username: str
    pin: str
    is_admin: bool = False
    created_at: datetime = Field(default_factory=datetime.utcnow)

class UserCreate(BaseModel):
    username: str
    pin: str
    is_admin: bool = False

class LoginRequest(BaseModel):
    username: str
    pin: str


def calculate_report_totals(report_data: dict):
    """Calculate all the totals for a daily report"""
    product_total = sum(item['amount'] for item in report_data.get('product_expenses', []))
    other_total = sum(item['amount'] for item in report_data.get('other_expenses', []))
    
    total_expenses = (
        report_data.get('employee_payout', 650) + 
        report_data.get('government_expense', 200) + 
        product_total + 
        other_total
    )
    
    pos_profit = report_data.get('pos_profit', 0)
    cash_in_register = pos_profit  # As per description
    remaining_balance = pos_profit - total_expenses
    excess = cash_in_register - remaining_balance if remaining_balance > 0 else 0
    
    return {
        'total_expenses': total_expenses,
        'cash_in_register': cash_in_register,
        'remaining_balance': remaining_balance,
        'excess': excess
    }


# Daily Reports Endpoints
@api_router.post("/reports", response_model=DailyReport)
async def create_daily_report(report_data: DailyReportCreate):
    # Calculate totals
    calculations = calculate_report_totals(report_data.dict())
    
    # Create the complete report
    report_dict = report_data.dict()
    report_dict.update(calculations)
    report_dict['updated_at'] = datetime.utcnow()
    
    report = DailyReport(**report_dict)
    
    # Save to database
    await db.daily_reports.insert_one(report.dict())
    return report

@api_router.get("/reports", response_model=List[DailyReport])
async def get_all_reports():
    reports = await db.daily_reports.find().sort("date", -1).to_list(1000)
    return [DailyReport(**report) for report in reports]

@api_router.get("/reports/{report_date}", response_model=DailyReport)
async def get_report_by_date(report_date: str):
    report = await db.daily_reports.find_one({"date": report_date})
    if not report:
        raise HTTPException(status_code=404, detail="Report not found")
    return DailyReport(**report)

@api_router.put("/reports/{report_date}", response_model=DailyReport)
async def update_daily_report(report_date: str, report_data: DailyReportCreate):
    # Calculate totals
    calculations = calculate_report_totals(report_data.dict())
    
    # Create the complete report
    report_dict = report_data.dict()
    report_dict.update(calculations)
    report_dict['updated_at'] = datetime.utcnow()
    
    # Update in database
    result = await db.daily_reports.replace_one(
        {"date": report_date}, 
        report_dict
    )
    
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Report not found")
    
    return DailyReport(**report_dict)

@api_router.delete("/reports/{report_date}")
async def delete_daily_report(report_date: str):
    result = await db.daily_reports.delete_one({"date": report_date})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Report not found")
    return {"message": "Report deleted successfully"}


# User Management Endpoints
@api_router.post("/users", response_model=User)
async def create_user(user_data: UserCreate):
    # Check if username already exists
    existing_user = await db.users.find_one({"username": user_data.username})
    if existing_user:
        raise HTTPException(status_code=400, detail="Username already exists")
    
    user = User(**user_data.dict())
    await db.users.insert_one(user.dict())
    return user

@api_router.post("/login")
async def login(login_data: LoginRequest):
    user = await db.users.find_one({
        "username": login_data.username,
        "pin": login_data.pin
    })
    if not user:
        raise HTTPException(status_code=401, detail="Invalid credentials")
    
    return {
        "message": "Login successful",
        "user": {
            "id": user["id"],
            "username": user["username"],
            "is_admin": user["is_admin"]
        }
    }

@api_router.get("/users", response_model=List[User])
async def get_all_users():
    users = await db.users.find().to_list(1000)
    return [User(**user) for user in users]


# Health check
@api_router.get("/")
async def root():
    return {"message": "Jadygoy Cafe Management API"}


# Include the router in the main app
app.include_router(api_router)

app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

@app.on_event("shutdown")
async def shutdown_db_client():
    client.close()