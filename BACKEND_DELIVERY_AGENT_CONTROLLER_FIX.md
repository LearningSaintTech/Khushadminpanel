# Backend fix: delivery agent controller – `req.files` undefined

## Problem
The admin panel sends **JSON** (no multipart), so `req.files` is **undefined**.  
`req.files.find(...)` then throws: *Cannot read properties of undefined (reading 'find')*.

## Fix
In your backend **delivery agent controller**, guard `req.files` before using `.find()`.

### Replace `createDeliveryAgentController` with:

```js
export const createDeliveryAgentController = async (req, res) => {
   try {
      const files = Array.isArray(req.files) ? req.files : [];
      const licenseImageFile = files.find(
         file => file.fieldname === "licenseImage"
      );
      console.log("licenseImageFile", licenseImageFile);

      const profileImageFile = files.find(
         file => file.fieldname === "profileImage"
      );
      console.log("profileImageFile", profileImageFile);

      const result = await createDeliveryAgent(req.body, licenseImageFile, profileImageFile);
      return successResponse(res, result, "Delivery agent created successfully", 201);
   } catch (error) {
      return errorResponse(res, error.message, error.statusCode || 400, error.errors);
   }
};
```

### Optional: same pattern for update if it uses `req.files`
If your update handler ever uses `req.files`, use the same guard:

```js
const files = Array.isArray(req.files) ? req.files : [];
// then use files.find(...) if needed
```

## Summary
- Use `const files = Array.isArray(req.files) ? req.files : [];` and then `files.find(...)`.
- Works when the request is JSON (no files) and when it is multipart (with files).
