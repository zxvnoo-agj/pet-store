"""Performance test for SPU API endpoints."""
import statistics
import time
import requests

BASE_URL = "http://localhost:8001/v1"

def measure_latency(endpoint: str, params: dict = None, iterations: int = 20) -> dict:
    """Measure API latency and return percentiles."""
    latencies = []
    for _ in range(iterations):
        start = time.perf_counter()
        resp = requests.get(f"{BASE_URL}{endpoint}", params=params, timeout=30)
        elapsed = (time.perf_counter() - start) * 1000  # ms
        latencies.append(elapsed)
        if resp.status_code != 200:
            print(f"Warning: {endpoint} returned {resp.status_code}")
    
    latencies.sort()
    n = len(latencies)
    p50 = latencies[n // 2]
    p95 = latencies[int(n * 0.95)]
    p99 = latencies[int(n * 0.99)]
    avg = statistics.mean(latencies)
    
    return {
        "avg_ms": round(avg, 2),
        "p50_ms": round(p50, 2),
        "p95_ms": round(p95, 2),
        "p99_ms": round(p99, 2),
        "min_ms": round(latencies[0], 2),
        "max_ms": round(latencies[-1], 2),
    }

def main():
    print("=" * 60)
    print("Performance Test: SPU Migration API")
    print("=" * 60)
    
    # T063: GET /v1/spus
    print("\n[T063] GET /v1/spus?page=1&page_size=20")
    stats = measure_latency("/spus", {"page": 1, "page_size": 20}, iterations=20)
    print(f"  avg={stats['avg_ms']}ms, p50={stats['p50_ms']}ms, p95={stats['p95_ms']}ms, p99={stats['p99_ms']}ms")
    print(f"  min={stats['min_ms']}ms, max={stats['max_ms']}ms")
    print(f"  ✓ PASS" if stats['p95_ms'] < 200 else f"  ✗ FAIL (p95 > 200ms)")
    
    # T064: GET /v1/search?q=幼猫
    print("\n[T064] GET /v1/search?q=幼猫")
    stats = measure_latency("/search", {"q": "幼猫"}, iterations=20)
    print(f"  avg={stats['avg_ms']}ms, p50={stats['p50_ms']}ms, p95={stats['p95_ms']}ms, p99={stats['p99_ms']}ms")
    print(f"  min={stats['min_ms']}ms, max={stats['max_ms']}ms")
    print(f"  ✓ PASS" if stats['p95_ms'] < 200 else f"  ✗ FAIL (p95 > 200ms)")
    
    print("\n" + "=" * 60)

if __name__ == "__main__":
    main()
