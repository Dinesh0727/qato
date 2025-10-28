# SSL Certificate Bypass - Usage Guide

## Overview
This feature allows you to bypass SSL certificate verification for API steps. This is useful when working with:
- Self-signed certificates
- Development environments with internal certificates
- Testing against servers with expired certificates

## How to Use

### 1. Add or Edit an API Step
When creating or editing an API step in your test case:

1. Enter your API URL (e.g., `https://rcmdev.karix.com/services/rcm/sendMessage`)
2. Configure your request (method, headers, body, etc.)
3. Look for the **"Skip SSL Certificate Verification"** checkbox
4. Check the box to enable SSL bypass for this step
5. Save the step

### 2. Visual Indicator
The SSL bypass setting is highlighted with a yellow warning box to remind you that this is a security-sensitive setting.

### 3. What Happens
When you enable SSL bypass for an API step:
- The generated Karate test will include: `* configure ssl = { trustAll: true }`
- This disables SSL certificate verification for that specific step
- Your test will proceed even if the server has an invalid or self-signed certificate

## Example

### Before (with SSL errors):
```gherkin
Given url 'https://rcmdev.karix.com/services/rcm/sendMessage'
And header Content-Type = 'application/json'
And request {...}
When method POST
```

**Result:** ❌ SSL handshake error - certificate verification fails

### After (with SSL bypass enabled):
```gherkin
Given url 'https://rcmdev.karix.com/services/rcm/sendMessage'
And headers {...}
* configure ssl = { trustAll: true }
And request {...}
When method POST
```

**Result:** ✅ Request succeeds, SSL verification is bypassed

## Security Warnings

⚠️ **Important Security Notes:**

1. **Development Only**: Only use this feature in development/test environments
2. **Man-in-the-Middle Risk**: Bypassing SSL verification makes you vulnerable to MITM attacks
3. **Data Integrity**: You lose assurance that you're connecting to the intended server
4. **Production**: For production, properly import certificates (see `SSL_CERTIFICATE_MANAGEMENT_TODO.md`)

## When to Use This Feature

✅ **Appropriate Use Cases:**
- Testing against development servers with self-signed certs
- Working with internal/private servers without proper certificates
- Troubleshooting SSL-related issues
- Local development environments

❌ **Inappropriate Use Cases:**
- Production API testing
- External APIs
- APIs handling sensitive data
- Public-facing services

## Production Alternative

For production, instead of bypassing SSL, you should:

1. Obtain the server's SSL certificate
2. Import it into Java's truststore
3. See `SSL_CERTIFICATE_MANAGEMENT_TODO.md` for detailed instructions

## Troubleshooting

### Certificate Errors
If you see errors like:
```
javax.net.ssl.SSLHandshakeException: PKIX path building failed
sun.security.provider.certpath.SunCertPathBuilderException: unable to find valid certification path
```

**Solution:** Enable "Skip SSL Certificate Verification" for that API step

### Still Having Issues?
1. Check that the checkbox is actually enabled
2. Verify the URL is correct
3. Ensure your network/firewall allows the connection
4. Check Karate logs for additional error messages

## Related Documentation
- `SSL_CERTIFICATE_MANAGEMENT_TODO.md` - Guide for production SSL certificate management
- [Karate Documentation](https://github.com/karatelabs/karate#configure)
