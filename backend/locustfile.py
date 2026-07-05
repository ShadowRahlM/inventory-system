"""Load testing for inventory-system API.

Usage:
    pip install locust
    locust -f locustfile.py --host http://localhost:8000
"""

import random
from locust import HttpUser, task, between


class InventoryUser(HttpUser):
    wait_time = between(1, 3)

    def on_start(self):
        resp = self.client.post("/api/auth/token/", json={
            "username": "manager",
            "password": "manager123",
        })
        if resp.status_code == 200:
            token = resp.json()["access"]
            self.client.headers = {"Authorization": f"Bearer {token}"}

    @task(3)
    def list_tiles(self):
        self.client.get("/api/inventory/tiles/", params={"page": 1, "page_size": 50})

    @task(3)
    def list_inventory(self):
        self.client.get("/api/inventory/inventory/", params={"page": 1, "page_size": 50})

    @task(2)
    def list_movements(self):
        self.client.get("/api/inventory/movements/", params={"page": 1, "page_size": 20})

    @task(1)
    def stock_summary(self):
        self.client.get("/api/inventory/reports/stock_summary/")

    @task(1)
    def movement_summary(self):
        self.client.get("/api/inventory/reports/movement_summary/")

    @task(1)
    def low_stock(self):
        self.client.get("/api/inventory/inventory/low_stock/")

    @task(2)
    def search_tiles(self):
        terms = ["floor", "wall", "tile", "ceramic", "porcelain"]
        self.client.get(f"/api/inventory/tiles/?search={random.choice(terms)}")

    @task(1)
    def list_batches(self):
        self.client.get("/api/inventory/batches/", params={"page": 1, "page_size": 20})

    @task(1)
    def list_customers(self):
        self.client.get("/api/inventory/customers/")

    @task(1)
    def list_suppliers(self):
        self.client.get("/api/inventory/suppliers/")

    @task(1)
    def get_docs(self):
        self.client.get("/api/schema/")

    @task(1)
    def list_notifications(self):
        self.client.get("/api/inventory/notifications/")


class AnonymousUser(HttpUser):
    wait_time = between(5, 15)
    weight = 1

    @task
    def login_attempt(self):
        self.client.post("/api/auth/token/", json={
            "username": "viewer",
            "password": "viewer123",
        })
