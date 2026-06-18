# Tiny diagnostic image: prove that our CMD executes on RunPod Serverless.
# If we see HELLO_FROM_TEST in the logs, the CMD runs and the issue is Python-specific.
# If we don't, RunPod is overriding our CMD with something else.

FROM ubuntu:22.04

RUN apt-get update && apt-get install -y --no-install-recommends ca-certificates && rm -rf /var/lib/apt/lists/*

# Use bash with explicit exec + heredoc-free loop. Force unbuffered stdout via stdbuf.
CMD ["bash", "-c", "echo 'HELLO_FROM_TEST: container CMD is alive at start'; for i in $(seq 1 9999); do echo \"HELLO_FROM_TEST: heartbeat #$i at $(date)\"; sleep 5; done"]
