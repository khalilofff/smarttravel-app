# Verification paused for presentation build

Email verification has not been deleted. It is intentionally paused so local testing and the presentation flow work without Resend/domain problems.

Current behavior:
- New accounts are created as verified.
- Login does not require email verification.
- No verification email is sent.
- Existing verification API/service files remain in the project for later use.

To enable later:
1. Verify a domain in Resend or configure a trusted sender.
2. Set `EMAIL_VERIFICATION_ENABLED=true`.
3. Set `RESEND_API_KEY`, `EMAIL_FROM`, and public `APP_URL`.
4. Restart the server.
