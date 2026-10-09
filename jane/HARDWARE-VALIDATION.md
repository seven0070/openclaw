# Jane hardware and owner-device validation

This is a release-evidence checklist, not an automated test report. Every item
below is currently **not run** in this Linux build environment. Record the
date, operator, OpenClaw commit/version, OS version, device model, and exact
Qwen quantization with each result.

| Area                 | Required procedure                                                                                                                                               | Pass condition                                                                                                           | Result  |
| -------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------ | ------- |
| Qwen3-4B             | Run `ollama pull qwen3:4b`; make a real local completion through the configured Jane agent.                                                                      | The response reports `ollama/qwen3:4b`; no cloud fallback or secret is required.                                         | Not run |
| GPU / VRAM           | Capture OS GPU inventory before and during the real completion (for example `nvidia-smi` where applicable).                                                      | The intended GPU is used or CPU-only operation is explicitly recorded; no OOM/restart.                                   | Not run |
| Owner authentication | Pair the target desktop/mobile approval client to the Gateway. Exercise allow-once, deny, expiry, cancellation, and Gateway restart for one protected call each. | Only the paired authenticated owner can approve; each approval binds the exact parameters and is not reusable.           | Not run |
| Desktop UI           | In the OpenClaw desktop or authenticated Control UI, select Jane; use chat, settings, memory, tool activity, Jane tasks, and Jane audit history.                 | All views render and task/audit data persist through a Gateway restart.                                                  | Not run |
| Voice                | Configure a supported speech provider and test microphone capture, transcription, response playback, interruption, and permission revocation.                    | Audio remains local or the chosen provider is disclosed; revocation stops capture/playback. Qwen3-4B alone is text-only. | Not run |
| Controlled coding    | In a disposable repository and sandbox, request a code change, test run, review, commit, and `git revert`.                                                       | Every write/exec prompt is owner-approved once; no policy/config self-edit or sandbox escape occurs.                     | Not run |

Do not convert a row to Pass based on unit tests, simulated devices, or a
different machine. Attach sanitized command output and any failure receipts to
the release record.
