import requests
import sys
import json
from datetime import datetime

class RunTrackerAPITester:
    def __init__(self, base_url="https://91c2d789-597e-42a3-aff2-bb06c883e1b5.preview.emergentagent.com"):
        self.base_url = base_url
        self.session = requests.Session()
        self.tests_run = 0
        self.tests_passed = 0
        self.test_results = []

    def log_test(self, name, success, details=""):
        """Log test result"""
        self.tests_run += 1
        if success:
            self.tests_passed += 1
        
        result = {
            "test": name,
            "success": success,
            "details": details,
            "timestamp": datetime.now().isoformat()
        }
        self.test_results.append(result)
        
        status = "✅ PASS" if success else "❌ FAIL"
        print(f"{status} - {name}")
        if details:
            print(f"    Details: {details}")

    def run_test(self, name, method, endpoint, expected_status, data=None, cookies=None):
        """Run a single API test"""
        url = f"{self.base_url}/{endpoint}"
        headers = {'Content-Type': 'application/json'}
        
        try:
            if method == 'GET':
                response = self.session.get(url, headers=headers, cookies=cookies)
            elif method == 'POST':
                response = self.session.post(url, json=data, headers=headers, cookies=cookies)
            elif method == 'PUT':
                response = self.session.put(url, json=data, headers=headers, cookies=cookies)
            elif method == 'DELETE':
                response = self.session.delete(url, headers=headers, cookies=cookies)

            success = response.status_code == expected_status
            details = f"Status: {response.status_code}"
            
            if not success:
                details += f" (expected {expected_status})"
                try:
                    error_data = response.json()
                    details += f", Response: {error_data}"
                except:
                    details += f", Response: {response.text[:200]}"
            
            self.log_test(name, success, details)
            
            if success:
                try:
                    return True, response.json()
                except:
                    return True, {}
            else:
                return False, {}

        except Exception as e:
            self.log_test(name, False, f"Error: {str(e)}")
            return False, {}

    def test_health(self):
        """Test health endpoint"""
        return self.run_test("Health Check", "GET", "api/health", 200)

    def test_register(self, email, password, name):
        """Test user registration"""
        return self.run_test(
            "User Registration",
            "POST",
            "api/auth/register",
            200,
            data={"email": email, "password": password, "name": name}
        )

    def test_login(self, email, password):
        """Test login and store cookies"""
        success, response = self.run_test(
            "User Login",
            "POST",
            "api/auth/login",
            200,
            data={"email": email, "password": password}
        )
        return success, response

    def test_auth_me(self):
        """Test getting current user"""
        return self.run_test("Get Current User", "GET", "api/auth/me", 200)

    def test_logout(self):
        """Test logout"""
        return self.run_test("User Logout", "POST", "api/auth/logout", 200)

    def test_create_route(self, name, points, distance):
        """Test route creation"""
        return self.run_test(
            "Create Route",
            "POST",
            "api/routes",
            200,
            data={
                "name": name,
                "points": points,
                "distance": distance,
                "estimated_duration": 1800
            }
        )

    def test_list_routes(self):
        """Test listing routes"""
        return self.run_test("List Routes", "GET", "api/routes", 200)

    def test_get_route(self, route_id):
        """Test getting specific route"""
        return self.run_test(f"Get Route {route_id}", "GET", f"api/routes/{route_id}", 200)

    def test_delete_route(self, route_id):
        """Test deleting route"""
        return self.run_test(f"Delete Route {route_id}", "DELETE", f"api/routes/{route_id}", 200)

    def test_create_run(self, name, points, distance, duration):
        """Test run creation"""
        return self.run_test(
            "Create Run",
            "POST",
            "api/runs",
            200,
            data={
                "name": name,
                "points": points,
                "distance": distance,
                "duration": duration,
                "elevation_gain": 50,
                "elevation_loss": 45,
                "calories": 300
            }
        )

    def test_list_runs(self):
        """Test listing runs"""
        return self.run_test("List Runs", "GET", "api/runs", 200)

    def test_run_stats(self):
        """Test run statistics"""
        return self.run_test("Run Statistics", "GET", "api/runs/stats", 200)

    def test_get_run(self, run_id):
        """Test getting specific run"""
        return self.run_test(f"Get Run {run_id}", "GET", f"api/runs/{run_id}", 200)

    def test_delete_run(self, run_id):
        """Test deleting run"""
        return self.run_test(f"Delete Run {run_id}", "DELETE", f"api/runs/{run_id}", 200)

    def test_get_profile(self):
        """Test getting profile"""
        return self.run_test("Get Profile", "GET", "api/profile", 200)

    def test_update_profile(self, name=None, weight=None, height=None):
        """Test updating profile"""
        data = {}
        if name:
            data["name"] = name
        if weight:
            data["weight"] = weight
        if height:
            data["height"] = height
        
        return self.run_test("Update Profile", "PUT", "api/profile", 200, data=data)

def main():
    print("🚀 Starting RunTracker API Tests")
    print("=" * 50)
    
    tester = RunTrackerAPITester()
    
    # Test 1: Health Check
    print("\n📋 Basic Health Tests")
    tester.test_health()
    
    # Test 2: Authentication Flow
    print("\n🔐 Authentication Tests")
    test_email = f"test_{datetime.now().strftime('%H%M%S')}@test.com"
    test_password = "TestPass123!"
    test_name = "Test User"
    
    # Register new user
    tester.test_register(test_email, test_password, test_name)
    
    # Login with admin credentials
    admin_success, admin_response = tester.test_login("admin@runtracker.com", "admin123")
    
    if admin_success:
        # Test authenticated endpoints
        print("\n👤 User Profile Tests")
        tester.test_auth_me()
        tester.test_get_profile()
        tester.test_update_profile(name="Updated Admin", weight=75, height=180)
        
        print("\n🗺️ Route Management Tests")
        # Create a test route
        test_points = [
            {"lat": 40.7128, "lng": -74.0060},
            {"lat": 40.7130, "lng": -74.0058},
            {"lat": 40.7132, "lng": -74.0056}
        ]
        route_success, route_response = tester.test_create_route("Test Route", test_points, 5.2)
        
        # List routes
        tester.test_list_routes()
        
        # Get specific route if created
        if route_success and 'route_id' in route_response:
            route_id = route_response['route_id']
            tester.test_get_route(route_id)
        
        # Test with seeded route
        tester.test_get_route("route_ca88e420acfa")
        
        print("\n🏃 Run Management Tests")
        # Create a test run
        run_success, run_response = tester.test_create_run("Test Run", test_points, 5.2, 1800)
        
        # List runs
        tester.test_list_runs()
        
        # Get run stats
        tester.test_run_stats()
        
        # Get specific run if created
        if run_success and 'run_id' in run_response:
            run_id = run_response['run_id']
            tester.test_get_run(run_id)
        
        # Test with seeded run
        tester.test_get_run("run_5a7612eee269")
        
        print("\n🗑️ Cleanup Tests")
        # Delete created items
        if route_success and 'route_id' in route_response:
            tester.test_delete_route(route_response['route_id'])
        
        if run_success and 'run_id' in run_response:
            tester.test_delete_run(run_response['run_id'])
        
        # Logout
        tester.test_logout()
    
    # Print final results
    print("\n" + "=" * 50)
    print(f"📊 Test Results: {tester.tests_passed}/{tester.tests_run} passed")
    
    if tester.tests_passed == tester.tests_run:
        print("🎉 All tests passed!")
        return 0
    else:
        print("⚠️ Some tests failed. Check details above.")
        return 1

if __name__ == "__main__":
    sys.exit(main())