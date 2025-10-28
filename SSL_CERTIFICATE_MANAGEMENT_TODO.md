# SSL Certificate Management TODO

## Current Implementation
The extension currently supports **skipping SSL verification** for development and testing purposes via the "Skip SSL Certificate Verification" checkbox in API step configuration. This is a quick solution for working with self-signed certificates or development environments.

**⚠️ Security Warning:** This feature should ONLY be used in development/testing environments. Using it in production bypasses important security checks.

## Production Solution (TODO)

For production deployments, proper SSL certificate management should be implemented. Follow the steps below:

### 1. Export the Server Certificate

#### Option A: Using OpenSSL (Linux/Mac/Git Bash on Windows)
```bash
openssl s_client -connect rcmdev.karix.com:443 -showcerts </dev/null | openssl x509 -outform PEM > rcmdev.crt
```

#### Option B: Using Browser
1. Visit the website in your browser
2. Click the padlock icon in the address bar
3. Click "Certificate"
4. Go to "Details" tab
5. Click "Export" or "Copy to File"
6. Save as `.crt` or `.pem` file

### 2. Add Certificate to Java Truststore

The Java runtime used by this extension reads SSL certificates from the Java truststore. To add a custom certificate:

```bash
# Find JAVA_HOME (where Java is installed)
# For Windows (typically): C:\Program Files\Java\jdk-17
# For Linux/Mac: Usually /usr/lib/jvm/java-17-openjdk-amd64 or similar

# Navigate to the Java security directory
cd $JAVA_HOME/lib/security

# Add the certificate to the truststore
keytool -import -alias rcmdev -file rcmdev.crt -keystore cacerts -storepass changeit

# On Windows, you may need to run:
# keytool -import -alias rcmdev -file rcmdev.crt -keystore "C:\Program Files\Java\jdk-17\lib\security\cacerts" -storepass changeit
```

**Note:** The default password for the `cacerts` keystore is `changeit`.

### 3. Implementation Options

#### Option A: Extension-Level Configuration
Allow users to configure custom SSL certificates through a settings UI:
- Add "SSL Certificate Management" to extension settings
- Allow users to upload `.crt` or `.pem` files
- Store these in a custom truststore or extension-specific keystore
- Configure Karate to use the custom truststore at runtime

```typescript
// In src/extension.ts - runGeneratedKarateTest function
const karateProcess = cp.spawn('java', [
    '-Djavax.net.ssl.trustStore=/path/to/custom/truststore',
    '-Djavax.net.ssl.trustStorePassword=changeit',
    `-Dkarate.options=--output "${outputDir}"`,
    '-jar',
    karateJarPath,
    absoluteFeaturePath,
], {
    cwd: projectRootPath
});
```

#### Option B: Custom Truststore Management
Create a feature to manage certificates in a workspace-specific truststore:

1. Add UI for certificate management in the webview
2. Create a workspace-specific truststore in `.qato/truststore.jks`
3. Allow users to import certificates through the UI
4. Configure Karate to use this truststore when running tests

```bash
# Create a custom truststore for the workspace
keytool -genkey -alias qato -keystore .qato/truststore.jks -storepass qato123

# Import server certificates
keytool -import -alias server-cert -file server.crt -keystore .qato/truststore.jks -storepass qato123 -noprompt
```

#### Option C: Environment Variables
Allow users to specify the truststore via environment variables:

```bash
export JAVA_OPTIONS="-Djavax.net.ssl.trustStore=/path/to/truststore.jks -Djavax.net.ssl.trustStorePassword=changeit"
```

### 4. Recommended Approach

**For Development:**
- Use the current "Skip SSL Verification" checkbox (already implemented)
- Document when to use it (self-signed certs, development servers)

**For Production:**
- Implement workspace-level truststore management
- Allow users to import certificates through the UI
- Store certificates securely in the workspace
- Provide clear warnings about security implications
- Add certificate expiration warnings

### 5. Code Implementation Plan

1. **Add Certificate Management UI** (`webview-ui/src/components/`):
   - `CertificateManagementDialog.tsx` - Dialog for importing/managing certificates
   - List of imported certificates
   - Add/Remove certificate functionality
   - Certificate expiration warning

2. **Add Backend Certificate Management** (`src/extension.ts`):
   - `importCertificate()` - Import certificate to workspace truststore
   - `getCertificates()` - List imported certificates
   - `removeCertificate()` - Remove a certificate
   - `manageWorkspaceTruststore()` - Handle truststore creation/updates

3. **Update Test Execution** (`src/extension.ts`):
   - Check if workspace has a custom truststore
   - Configure Karate JVM with custom truststore path
   - Fall back to system truststore if no custom one exists

4. **Add Configuration** (`src/workspaceTypes.ts`):
   ```typescript
   export interface SslConfig {
     truststorePath?: string;
     truststorePassword?: string;
     skipVerification?: boolean; // Current implementation
     certificates?: Array<{
       alias: string;
       issuer: string;
       validUntil: Date;
     }>;
   }
   ```

### 6. Security Best Practices

- ⚠️ Never commit truststore files to version control
- ⚠️ Use strong passwords for custom truststores
- ⚠️ Regularly update certificates before expiration
- ⚠️ Document which certificates are used in your environment
- ⚠️ Use the `skipSslVerification` flag only in development

### 7. References

- [Java Keytool Documentation](https://docs.oracle.com/javase/8/docs/technotes/tools/unix/keytool.html)
- [Karate SSL Configuration](https://github.com/karatelabs/karate#configure)
- [VS Code Secrets API](https://code.visualstudio.com/api/references/vscode-api#SecretStorage) - For secure password storage

---

**Status:** Current implementation provides quick SSL bypass for development. Production certificate management is pending implementation.

