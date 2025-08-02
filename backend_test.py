import requests
import sys
import json
from datetime import datetime, date
import uuid

class JadygoyCafeAPITester:
    def __init__(self, base_url="https://a417e4a6-5ebe-4f46-a6b4-2d8450fd04d8.preview.emergentagent.com/api"):
        self.base_url = base_url
        self.tests_run = 0
        self.tests_passed = 0
        self.test_user_id = None
        self.test_date = date.today().strftime('%Y-%m-%d')

    def run_test(self, name, method, endpoint, expected_status, data=None, headers=None):
        """Run a single API test"""
        url = f"{self.base_url}/{endpoint}"
        if headers is None:
            headers = {'Content-Type': 'application/json'}

        self.tests_run += 1
        print(f"\n🔍 Testing {name}...")
        print(f"   URL: {url}")
        
        try:
            if method == 'GET':
                response = requests.get(url, headers=headers)
            elif method == 'POST':
                response = requests.post(url, json=data, headers=headers)
            elif method == 'PUT':
                response = requests.put(url, json=data, headers=headers)
            elif method == 'DELETE':
                response = requests.delete(url, headers=headers)

            success = response.status_code == expected_status
            if success:
                self.tests_passed += 1
                print(f"✅ Passed - Status: {response.status_code}")
                try:
                    response_data = response.json()
                    print(f"   Response: {json.dumps(response_data, indent=2)[:200]}...")
                except:
                    print(f"   Response: {response.text[:200]}...")
            else:
                print(f"❌ Failed - Expected {expected_status}, got {response.status_code}")
                print(f"   Response: {response.text[:200]}...")

            return success, response.json() if response.text and response.status_code != 204 else {}

        except Exception as e:
            print(f"❌ Failed - Error: {str(e)}")
            return False, {}

    def test_health_check(self):
        """Test the health check endpoint"""
        success, response = self.run_test(
            "Health Check",
            "GET",
            "",
            200
        )
        return success

    def test_create_user(self, username, pin, is_admin=False):
        """Test user creation"""
        success, response = self.run_test(
            f"Create User ({username})",
            "POST",
            "users",
            200,
            data={
                "username": username,
                "pin": pin,
                "is_admin": is_admin
            }
        )
        if success and 'id' in response:
            return response['id']
        return None

    def test_login(self, username, pin):
        """Test user login"""
        success, response = self.run_test(
            f"Login ({username})",
            "POST",
            "login",
            200,
            data={
                "username": username,
                "pin": pin
            }
        )
        return success, response

    def test_invalid_login(self):
        """Test login with invalid credentials"""
        success, response = self.run_test(
            "Invalid Login",
            "POST",
            "login",
            401,
            data={
                "username": "invalid",
                "pin": "0000"
            }
        )
        return success

    def test_get_users(self):
        """Test getting all users"""
        success, response = self.run_test(
            "Get All Users",
            "GET",
            "users",
            200
        )
        return success, response

    def test_create_daily_report(self, report_data):
        """Test creating a daily report"""
        success, response = self.run_test(
            f"Create Daily Report ({report_data['date']})",
            "POST",
            "reports",
            200,
            data=report_data
        )
        return success, response

    def test_get_all_reports(self):
        """Test getting all reports"""
        success, response = self.run_test(
            "Get All Reports",
            "GET",
            "reports",
            200
        )
        return success, response

    def test_get_report_by_date(self, report_date):
        """Test getting a report by date"""
        success, response = self.run_test(
            f"Get Report by Date ({report_date})",
            "GET",
            f"reports/{report_date}",
            200
        )
        return success, response

    def test_get_nonexistent_report(self):
        """Test getting a non-existent report"""
        fake_date = "2099-12-31"
        success, response = self.run_test(
            f"Get Non-existent Report ({fake_date})",
            "GET",
            f"reports/{fake_date}",
            404
        )
        return success

    def test_update_daily_report(self, report_date, updated_data):
        """Test updating a daily report"""
        success, response = self.run_test(
            f"Update Daily Report ({report_date})",
            "PUT",
            f"reports/{report_date}",
            200,
            data=updated_data
        )
        return success, response

    def test_delete_daily_report(self, report_date):
        """Test deleting a daily report"""
        success, response = self.run_test(
            f"Delete Daily Report ({report_date})",
            "DELETE",
            f"reports/{report_date}",
            200
        )
        return success

    def test_business_logic_calculations(self):
        """Test the business logic calculations"""
        print("\n🧮 Testing Business Logic Calculations...")
        
        # Test data with known values
        test_report = {
            "date": "2024-01-15",
            "pos_profit": 1000.0,
            "employee_payout": 650.0,
            "government_expense": 200.0,
            "product_expenses": [
                {"id": str(uuid.uuid4()), "title": "Coffee Beans", "amount": 50.0},
                {"id": str(uuid.uuid4()), "title": "Milk", "amount": 30.0}
            ],
            "other_expenses": [
                {"id": str(uuid.uuid4()), "title": "Cleaning Supplies", "amount": 20.0}
            ],
            "created_by": "test_admin"
        }

        success, response = self.test_create_daily_report(test_report)
        
        if success:
            # Expected calculations:
            # Product total: 50 + 30 = 80
            # Other total: 20
            # Total expenses: 650 + 200 + 80 + 20 = 950
            # Cash in register: 1000 (same as POS profit)
            # Remaining balance: 1000 - 950 = 50
            # Excess: 1000 - 50 = 950 (if remaining > 0)
            
            expected_total_expenses = 950.0
            expected_cash_in_register = 1000.0
            expected_remaining_balance = 50.0
            
            actual_total_expenses = response.get('total_expenses', 0)
            actual_cash_in_register = response.get('cash_in_register', 0)
            actual_remaining_balance = response.get('remaining_balance', 0)
            
            print(f"Expected Total Expenses: {expected_total_expenses}")
            print(f"Actual Total Expenses: {actual_total_expenses}")
            print(f"Expected Cash in Register: {expected_cash_in_register}")
            print(f"Actual Cash in Register: {actual_cash_in_register}")
            print(f"Expected Remaining Balance: {expected_remaining_balance}")
            print(f"Actual Remaining Balance: {actual_remaining_balance}")
            
            calculations_correct = (
                abs(actual_total_expenses - expected_total_expenses) < 0.01 and
                abs(actual_cash_in_register - expected_cash_in_register) < 0.01 and
                abs(actual_remaining_balance - expected_remaining_balance) < 0.01
            )
            
            if calculations_correct:
                print("✅ Business logic calculations are correct!")
                self.tests_passed += 1
            else:
                print("❌ Business logic calculations are incorrect!")
            
            self.tests_run += 1
            return calculations_correct
        
        return False

def main():
    print("🚀 Starting Jadygoy Cafe API Tests...")
    print("=" * 60)
    
    tester = JadygoyCafeAPITester()
    
    # Test 1: Health Check
    if not tester.test_health_check():
        print("❌ Health check failed, API might be down")
        return 1

    # Test 2: Create test users (or use existing ones)
    admin_id = tester.test_create_user("admin", "1234", True)
    employee_id = tester.test_create_user("employee", "5678", False)
    
    # If users already exist, that's fine - we can still test login
    print("ℹ️  Users may already exist, proceeding with login tests...")

    # Test 3: Test login functionality
    admin_login_success, admin_login_response = tester.test_login("admin", "1234")
    employee_login_success, employee_login_response = tester.test_login("employee", "5678")
    
    if not admin_login_success or not employee_login_success:
        print("❌ Login tests failed")
        return 1

    # Test 4: Test invalid login
    if not tester.test_invalid_login():
        print("❌ Invalid login test failed")
        return 1

    # Test 5: Get all users
    users_success, users_response = tester.test_get_users()
    if not users_success:
        print("❌ Get users test failed")
        return 1

    # Test 6: Test business logic calculations
    if not tester.test_business_logic_calculations():
        print("❌ Business logic calculations test failed")
        return 1

    # Test 7: Create a daily report
    sample_report = {
        "date": tester.test_date,
        "pos_profit": 1500.0,
        "employee_payout": 650.0,
        "government_expense": 200.0,
        "product_expenses": [
            {"id": str(uuid.uuid4()), "title": "Coffee", "amount": 100.0}
        ],
        "other_expenses": [
            {"id": str(uuid.uuid4()), "title": "Utilities", "amount": 50.0}
        ],
        "created_by": "admin"
    }
    
    report_success, report_response = tester.test_create_daily_report(sample_report)
    if not report_success:
        print("❌ Create daily report test failed")
        return 1

    # Test 8: Get all reports
    all_reports_success, all_reports_response = tester.test_get_all_reports()
    if not all_reports_success:
        print("❌ Get all reports test failed")
        return 1

    # Test 9: Get report by date
    get_report_success, get_report_response = tester.test_get_report_by_date(tester.test_date)
    if not get_report_success:
        print("❌ Get report by date test failed")
        return 1

    # Test 10: Test getting non-existent report
    if not tester.test_get_nonexistent_report():
        print("❌ Non-existent report test failed")
        return 1

    # Test 11: Update the daily report
    updated_report = {
        "date": tester.test_date,
        "pos_profit": 1600.0,  # Updated value
        "employee_payout": 650.0,
        "government_expense": 200.0,
        "product_expenses": [
            {"id": str(uuid.uuid4()), "title": "Coffee", "amount": 120.0}  # Updated value
        ],
        "other_expenses": [
            {"id": str(uuid.uuid4()), "title": "Utilities", "amount": 50.0}
        ],
        "created_by": "admin"
    }
    
    update_success, update_response = tester.test_update_daily_report(tester.test_date, updated_report)
    if not update_success:
        print("❌ Update daily report test failed")
        return 1

    # Test 12: Delete the daily report
    if not tester.test_delete_daily_report(tester.test_date):
        print("❌ Delete daily report test failed")
        return 1

    # Print final results
    print("\n" + "=" * 60)
    print(f"📊 FINAL RESULTS:")
    print(f"   Tests Run: {tester.tests_run}")
    print(f"   Tests Passed: {tester.tests_passed}")
    print(f"   Success Rate: {(tester.tests_passed/tester.tests_run)*100:.1f}%")
    
    if tester.tests_passed == tester.tests_run:
        print("🎉 ALL TESTS PASSED! Backend API is working correctly.")
        return 0
    else:
        print(f"⚠️  {tester.tests_run - tester.tests_passed} tests failed. Backend needs attention.")
        return 1

if __name__ == "__main__":
    sys.exit(main())