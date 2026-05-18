# Common Verification Gaps

A checklist of scenarios frequently missed during verification.

## Input Validation

- [ ] Empty input
- [ ] Null or undefined input
- [ ] Input at maximum length
- [ ] Input exceeding maximum length
- [ ] Special characters and Unicode
- [ ] Malformed input (wrong type, wrong format)

## Error Handling

- [ ] Error messages are user-friendly, not stack traces
- [ ] Errors are logged with sufficient context
- [ ] Failed operations do not leave system in inconsistent state
- [ ] Timeouts are handled, not left to hang

## State and Side Effects

- [ ] Database changes are committed or rolled back correctly
- [ ] File writes are atomic or have rollback capability
- [ ] Cache invalidation happens when data changes
- [ ] External service failures are handled (fallback, retry, or graceful degradation)

## Security

- [ ] Authentication is enforced where required
- [ ] Authorization checks the right resource
- [ ] Sensitive data is not logged
- [ ] Input is sanitized before use in queries or commands

## Observability

- [ ] New features emit relevant logs
- [ ] Metrics are captured where performance matters
- [ ] Health checks reflect actual dependency status

## Edge Cases

- [ ] Concurrent access (race conditions)
- [ ] Large data sets (performance degradation)
- [ ] Network partitions or slow connections
- [ ] Clock skew or timezone issues
- [ ] Backward compatibility (old clients, old data formats)

## Rule

If the plan does not mention a scenario, assume it is out of scope for this slice, but surface it as a risk if it is obviously critical.
