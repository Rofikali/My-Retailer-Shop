---
name: architecture-performance
description: Evaluate architecture changes, performance bottlenecks, native Rust, WebAssembly, queues, caches, or service extraction. Use before adding a runtime, framework, infrastructure dependency, or performance optimization.
---

# Architecture and Performance Evaluation

Read root AGENTS.md and docs/25-ADR-001-Modular-Monolith-and-Rust-Adoption.md first.

## Workflow

1. **State the problem**
   - Identify the user-visible or operational problem.
   - Identify the affected module, request path, workload, dataset, and deployment target.
   - Do not treat a technology preference as a problem statement.

2. **Establish a baseline**
   - Use representative production-like data and hardware/runtime.
   - Measure latency distribution, throughput, CPU, memory, startup time, bundle size, and database time as relevant.
   - Separate database/network waiting from CPU-bound work.
   - Record exact commands, environment, dataset size, and results.

3. **Check simpler options first**
   - Inspect query plans, indexes, N+1 queries, pagination, serialization, and algorithmic complexity.
   - Consider batching, bounded concurrency, streaming, or a simpler TypeScript implementation.
   - Do not add Redis, a queue, another database, or a service boundary without its own demonstrated need.

4. **Compare implementation choices**
   - TypeScript remains the reference/default.
   - For server CPU-bound work, evaluate a Rust native executable/worker before a native shared-library ABI unless the target runtime and ABI are deliberately controlled.
   - For browser CPU-bound work or a validated offline requirement, evaluate Rust-to-WASM.
   - Do not assume .so compatibility across operating systems, CPU architectures, Node/Nitro runtimes, serverless hosts, or Vercel deployments.

5. **Protect business invariants**
   - Rust/WASM must not become the authority for authentication, authorization, tenant ownership, database writes, journal posting, stock reservation, or financial balances.
   - Validate untrusted inputs on the server.
   - Preserve exact money arithmetic and deterministic behavior.
   - Compare outputs against trusted TypeScript/reference calculations using edge cases and property-based or differential tests where appropriate.

6. **Evaluate total cost**
   - Include build toolchain, cross-compilation, artifact signing/provenance, deployment packaging, observability, debugging, dependency updates, fallback behavior, and maintainer expertise.
   - For WASM include download size, initialization, browser compatibility, and low-end mobile performance.
   - For native code include ABI, memory ownership, panic/error boundaries, architecture/OS compatibility, and runtime support.

7. **Document and decide**
   - Write or update an ADR with problem, alternatives, measurements, decision, risks, rollout, and rollback plan.
   - Adopt only if the measured benefit is material to users or operating cost and outweighs maintenance and operational complexity.
   - Otherwise record the result and retain the simpler implementation.

## Required verification

- Reproducible before/after benchmark on representative workloads.
- Correctness parity tests against the trusted implementation.
- Error, malformed-input, boundary, and resource-limit tests.
- Deployment test on the actual target runtime/architecture.
- CI checks for all affected build targets.
- Evidence that failure of the optional component does not corrupt financial or inventory records.

## Completion report

Report the problem, baseline, alternatives, measurements, selected approach, correctness evidence, deployment evidence, operational cost, rollback plan, and why the selected solution is simpler overall.
