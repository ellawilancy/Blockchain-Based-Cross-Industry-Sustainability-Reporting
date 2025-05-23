;; Entity Verification Contract
;; Validates reporting organizations

(define-data-var admin principal tx-sender)

;; Map to store verified entities
(define-map verified-entities principal
  {
    name: (string-utf8 100),
    industry: (string-utf8 50),
    verification-date: uint,
    is-active: bool
  }
)

;; Public function to register a new entity (only admin can call)
(define-public (register-entity (entity principal) (name (string-utf8 100)) (industry (string-utf8 50)))
  (begin
    (asserts! (is-eq tx-sender (var-get admin)) (err u100))
    (asserts! (is-none (map-get? verified-entities entity)) (err u101))
    (ok (map-set verified-entities entity
      {
        name: name,
        industry: industry,
        verification-date: block-height,
        is-active: true
      }
    ))
  )
)

;; Public function to deactivate an entity
(define-public (deactivate-entity (entity principal))
  (begin
    (asserts! (is-eq tx-sender (var-get admin)) (err u100))
    (asserts! (is-some (map-get? verified-entities entity)) (err u102))
    (match (map-get? verified-entities entity)
      entity-data (ok (map-set verified-entities entity
        (merge entity-data { is-active: false })
      ))
      (err u102)
    )
  )
)

;; Read-only function to check if an entity is verified
(define-read-only (is-verified (entity principal))
  (match (map-get? verified-entities entity)
    entity-data (is-eq (get is-active entity-data) true)
    false
  )
)

;; Read-only function to get entity details
(define-read-only (get-entity-details (entity principal))
  (map-get? verified-entities entity)
)

;; Function to transfer admin rights
(define-public (transfer-admin (new-admin principal))
  (begin
    (asserts! (is-eq tx-sender (var-get admin)) (err u100))
    (ok (var-set admin new-admin))
  )
)
