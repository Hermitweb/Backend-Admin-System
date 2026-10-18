# Security Migration Guide - JWT RS256 + HttpOnly Cookie & File Upload Security

## Overview

This document describes the security enhancements implemented in this migration:

### 1. JWT Authentication Security Upgrade
- **RS256 Asymmetric Encryption**: Migrated from HS256 (symmetric) to RS256 (RSA-based asymmetric) encryption
- **HttpOnly Cookie Transport**: Access tokens now use secure HTTP-only cookies instead of Authorization header
- **Refresh Token Rotation**: Implemented token rotation to prevent token replay attacks
- **Device Fingerprint Binding**: Each login session is bound to a device fingerprint for session tracking

### 2. File Upload Security Enhancements
- **Magic Number Validation**: Detects actual file types regardless of extension to prevent malicious uploads
- **SVG Purification**: Automatically sanitizes SVG files to remove XSS vectors
- **ClamAV Integration**: Async virus scanning stub ready for production deployment
- **UUID Filename Renaming**: Prevents enumeration attacks and filename collisions
- **Strict Whitelist Enforcement**: Dual validation of both file extensions AND MIME types

---

## Files Modified/Created

### Authentication Module
- `src/auth/auth.module.ts` - Updated JWT module configuration for RS256
- `src/auth/auth.service.ts` - Complete rewrite with cookie-based auth and device fingerprinting
- `src/auth/jwt.strategy.ts` - Updated to extract token from HttpOnly cookies
- `src/auth/auth.controller.ts` - Added cookie management and device endpoints
- `src/auth/rsa-key.generator.ts` - NEW: RSA key pair generation utility
- `src/entity/device-fingerprint.entity.ts` - NEW: Device fingerprint tracking entity

### Upload Module
- `src/upload/upload.service.ts` - Enhanced with magic number, SVG purification, ClamAV stub
- `src/upload/upload.controller.ts` - Updated with new upload categories and error handling

### Core Configuration
- `src/main.ts` - Enhanced CORS configuration for credentials
- `src/entity/index.ts` - Added DeviceFingerprint export
- `src/entity/user.entity.ts` - Added refresh token and device fingerprint fields
- `package.json` - Added dompurify and jsdom dependencies

### Documentation
- `.env.example` - NEW: Environment variable template with all required settings

---

## Environment Variables Required

```bash
# JWT Configuration (RS256 - Asymmetric Encryption)
JWT_EXPIRES_IN=1h

# RSA Key Paths (auto-generated on first run)
RSA_PRIVATE_KEY_PATH=./keys/private.key
RSA_PUBLIC_KEY_PATH=./keys/public.key

# Or provide base64-encoded keys directly (for production secrets)
RSA_PRIVATE_KEY=<your-private-key>
RSA_PUBLIC_KEY=<your-public-key>

# Device Fingerprinting
FINGERPRINT_SALT=your-custom-salt-key-min-32-characters-here-for-security

# Virus Scanning (Optional - ClamAV)
CLAMAV_ENABLED=false
CLAMAV_HOST=localhost
CLAMAV_PORT=3310

# CORS Configuration
CORS_ORIGINS=http://localhost:3000,http://localhost:5173
```

**IMPORTANT**: Generate RSA keys automatically on first startup, or generate them manually:

```bash
# Generate RSA key pair (4096-bit)
openssl genpkey -algorithm RSA -out private.key -aes256 -pkeyopt rsa_keygen_bits:4096
openssl pkey -in private.key -pubout -out public.key
```

---

## API Changes

### Authentication Endpoints

#### Login (POST /api/v1/auth/login)
**Request Body:**
```json
{
  "email": "user@example.com",
  "password": "secure-password"
}
```

**Response Headers:**
```
Set-Cookie: access_token=<jwt-token>; HttpOnly; Secure; SameSite=Strict; Max-Age=3600; Path=/
```

**Response Body:**
```json
{
  "code": 0,
  "message": "success",
  "data": {
    "user": {
      "id": "uuid",
      "email": "user@example.com",
      "name": "User Name",
      "avatar": null,
      "role": "user"
    }
  }
}
```

> **Note**: The access token is now set as an HttpOnly cookie and NOT returned in the response body. The browser will automatically include it in subsequent requests.

#### Register (POST /api/v1/auth/register)
Same pattern as login - sets cookie automatically.

#### Logout (POST /api/v1/auth/logout)
Inactivates the refresh token and clears the HttpOnly cookie.

#### Get Current User (GET /api/v1/auth/me)
Returns current authenticated user information (protected route).

#### Active Devices (GET /api/v1/auth/devices)
Returns list of registered devices for current user.

#### Revoke Device (DELETE /api/v1/auth/devices/:deviceId)
Remove a specific device from trusted list.

#### Revoke All Sessions (POST /api/v1/auth/revoke-all)
Logout from all devices and invalidate all tokens.

### Upload Endpoints

#### Single Upload (POST /api/v1/uploads)
```json
{
  "category": "images|documents|svgs"
}
```

Uploads file with full security validation.

#### Multiple Upload (POST /api/v1/uploads/multiple)
Upload multiple files with batch processing.

#### Upload Config (GET /api/v1/uploads/config)
Returns allowed extensions, MIME types, and size limits per category.

---

## Security Features Explained

### 1. RS256 Asymmetric Encryption

**Benefits over HS256:**
- Private key never leaves the server
- Public key can be safely distributed
- Better suited for microservices architectures
- Enhanced protection against key compromise

**Implementation:**
- Keys are generated once and stored in `./keys/` directory
- Private key used for signing tokens
- Public key used for verification

### 2. HttpOnly Cookies

**Security Advantages:**
- JavaScript cannot access tokens (prevents XSS token theft)
- Browser automatically includes cookies in requests
- More secure than localStorage or Authorization headers

**Cookie Attributes:**
- `HttpOnly`: Prevents client-side JavaScript access
- `Secure`: Only sent over HTTPS in production
- `SameSite=Strict`: CSRF protection
- `Max-Age=3600`: 1 hour expiration

### 3. Refresh Token Rotation

**How it works:**
1. On each request with valid refresh token
2. Issue a new refresh token
3. Invalidate the old one
4. If old token is used again → authentication failure

**Benefits:**
- Limits damage from token theft
- Enables immediate revocation
- Detects token reuse attacks

### 4. Device Fingerprinting

**Generated from:**
- User-Agent string
- IP address
- Salted hash for privacy

**Features:**
- Track all active devices per user
- Revoke individual devices
- Detect suspicious login patterns
- Cooldown period after failed attempts

### 5. Magic Number Validation

**Supported Formats:**
- JPEG: `FF D8 FF`
- PNG: `89 50 4E 47`
- GIF: `47 49 46`
- PDF: `25 50 44 46`
- ZIP: `50 4B 03 04`
- SVG: `<svg` (text detection)
- HTML/JSON: Pattern matching

**Prevents:**
- Malicious files with fake extensions
- PHP scripts named `image.jpg.php`
- Executables renamed to `.pdf`

### 6. SVG Purification

**Removes dangerous elements:**
- `<script>` tags
- Event handlers (`onclick`, `onload`, etc.)
- External resources (`<object>`, `<embed>`)
- JavaScript protocols

**Uses DOMPurify library** with strict sanitization rules.

### 7. ClamAV Virus Scanner (Stub)

**Ready-to-integrate framework:**
- Socket connection to clamd daemon
- Stream-based virus scanning
- Automatic deletion of infected files
- Non-blocking background scan

**Environment variables:**
- `CLAMAV_ENABLED=true` to activate
- `CLAMAV_HOST` and `CLAMAV_PORT` for daemon location

---

## Migration Steps

### For Developers

1. **Update Dependencies**
   ```bash
   npm install
   ```

2. **Generate RSA Keys** (automatic on first startup)
   - Run the application once
   - Keys will be auto-generated in `./keys/` directory
   - Move keys to secure location in production

3. **Configure Environment Variables**
   - Copy `.env.example` to `.env`
   - Update all values appropriately
   - Set proper `NODE_ENV` (production/development)

4. **Database Migration**
   The following tables need to be created:
   - `device_fingerprints` (new)
   - Users table columns added: `refreshToken`, `deviceFingerprint`

5. **Frontend Adjustments**
   - Remove `Authorization: Bearer <token>` header usage
   - Enable credentials in fetch/Axios: `{ withCredentials: true }`
   - Ensure CORS credentials are enabled in browser

### For Production

1. **Key Management**
   - Use environment variables or secret manager for RSA keys
   - Never commit keys to version control
   - Rotate keys periodically

2. **CORS Configuration**
   ```
   CORS_ORIGINS=https://your-domain.com
   NODE_ENV=production
   ```

3. **Virus Scanning**
   - Deploy ClamAV alongside backend
   - Configure firewall rules
   - Test scanning performance

4. **Monitoring**
   - Log authentication events
   - Monitor device fingerprint changes
   - Alert on repeated failures

---

## Testing Security Features

### Test Login Cookie
```bash
curl -X POST http://localhost:3000/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"password"}' \
  -c cookies.txt

# Check cookies.txt contains access_token with HttpOnly flag
cat cookies.txt
```

### Test Magic Number Validation
Try uploading a file with wrong extension:
- Rename `malware.php` to `image.png`
- Should fail magic number validation
- Error message explains detected vs expected type

### Test SVG Purification
Upload SVG with script tag:
```xml
<svg>
  <script>alert('XSS')</script>
</svg>
```
- Script tag will be removed
- Log shows purification event

### Test Device Tracking
```bash
# List active devices
curl http://localhost:3000/api/v1/auth/devices \
  --cookie cookies.txt

# Revoke a device
curl -X DELETE http://localhost:3000/api/v1/auth/devices/<device-id> \
  -H "Content-Type: application/json" \
  -d '{}' \
  --cookie cookies.txt
```

---

## Troubleshooting

### Issue: CORS errors with cookies
**Solution**: Ensure both frontend and backend have `credentials: true` configured

### Issue: "Invalid token" after deployment
**Solution**: Check RSA key paths match exactly between code and environment variables

### Issue: Upload fails for known file types
**Solution**: Verify magic numbers array includes your file type signatures

### Issue: SVG not being purified
**Solution**: Check `dompurify` package installed and JSDOM available globally

---

## Performance Considerations

### Token Signing Speed
- RS256 is slower than HS256 (~2-3x)
- Mitigation: Use Redis caching for validated tokens

### File Validation Overhead
- Magic number check: ~1ms
- SVG purification: ~50-100ms for large files
- Virus scan: ~100-500ms (optional, async recommended)

### Recommendations
1. Implement CDN for uploaded files
2. Cache validated tokens where appropriate
3. Queue virus scans asynchronously in production

---

## Future Enhancements

- [ ] Rate limiting per IP/device combination
- [ ] Anomaly detection for login patterns
- [ ] WebAuthn/FIDO2 support for passwordless auth
- [ ] Real-time virus scanning integration
- [ ] File deduplication via content hashing
- [ ] Progress tracking for large file uploads

---

## Support

For issues or questions about this migration:
1. Check this guide's troubleshooting section
2. Review logged errors in console/logs
3. Verify all environment variables are set correctly
4. Ensure database migrations are complete

---

**Security Compliance**: This implementation follows OWASP best practices for authentication and file upload security.
