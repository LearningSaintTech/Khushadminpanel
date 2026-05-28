# Postman — Money Features (Admin)

Import these into Postman:

- `Khush Money Features.postman_collection.json`
- `Khush-admin.local.postman_environment.json`

## Setup

1. Select environment **Khush-admin local**
2. Set:
   - `baseUrl` (default is `http://localhost:5000/api`)
   - `token` (admin JWT, used as `Authorization: Bearer {{token}}`)
3. Optional: after creating/listing entities, copy IDs into:
   - `giftCardRuleId`, `couponId`, `rewardRuleId`

## Notes

- Gift card **create/update** requests are `multipart/form-data` (image upload + JSON strings for `rules` and `bonusTiers`).
- Admin wallet endpoints used by the UI live under `/admin/wallet/*`.

