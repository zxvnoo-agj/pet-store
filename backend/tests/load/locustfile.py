"""Locust load test for Pet Store API.

Usage:
  locust -f backend/tests/load/locustfile.py --host=http://localhost:8000

Simulates concurrent users browsing products, viewing details,
searching, and interacting with the AI chat endpoint.
"""
from locust import HttpUser, task, between


class PetStoreUser(HttpUser):
    wait_time = between(1, 5)

    @task(10)
    def browse_spus(self):
        self.client.get("/v1/spus?page=1&page_size=20")

    @task(5)
    def browse_spus_filtered(self):
        self.client.get("/v1/spus?page=1&page_size=20&sort=newest")

    @task(3)
    def view_spu_detail(self):
        self.client.get("/v1/spus/1")

    @task(3)
    def search_spus(self):
        self.client.get("/v1/search?q=dog+food&page=1&page_size=20")

    @task(2)
    def get_categories(self):
        self.client.get("/v1/categories")

    @task(2)
    def get_search_suggestions(self):
        self.client.get("/v1/search/suggestions?q=dog")

    @task(1)
    def view_spu_reviews(self):
        self.client.get("/v1/spus/1/reviews?page=1&page_size=10")
