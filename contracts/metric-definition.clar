;; Metric Definition Contract
;; Standardizes sustainability measures

(define-data-var admin principal tx-sender)

;; Map to store metric definitions
(define-map metrics uint
  {
    name: (string-utf8 100),
    description: (string-utf8 500),
    unit: (string-utf8 20),
    category: (string-utf8 50),
    created-at: uint
  }
)

;; Counter for metric IDs
(define-data-var metric-counter uint u1)

;; Public function to add a new metric (only admin can call)
(define-public (add-metric (name (string-utf8 100)) (description (string-utf8 500)) (unit (string-utf8 20)) (category (string-utf8 50)))
  (let ((metric-id (var-get metric-counter)))
    (begin
      (asserts! (is-eq tx-sender (var-get admin)) (err u100))
      (map-set metrics metric-id
        {
          name: name,
          description: description,
          unit: unit,
          category: category,
          created-at: block-height
        }
      )
      (var-set metric-counter (+ metric-id u1))
      (ok metric-id)
    )
  )
)

;; Public function to update a metric (only admin can call)
(define-public (update-metric (metric-id uint) (name (string-utf8 100)) (description (string-utf8 500)) (unit (string-utf8 20)) (category (string-utf8 50)))
  (begin
    (asserts! (is-eq tx-sender (var-get admin)) (err u100))
    (asserts! (is-some (map-get? metrics metric-id)) (err u103))
    (ok (map-set metrics metric-id
      {
        name: name,
        description: description,
        unit: unit,
        category: category,
        created-at: (get created-at (unwrap-panic (map-get? metrics metric-id)))
      }
    ))
  )
)

;; Read-only function to get metric details
(define-read-only (get-metric (metric-id uint))
  (map-get? metrics metric-id)
)

;; Read-only function to get total metrics count
(define-read-only (get-metrics-count)
  (var-get metric-counter)
)

;; Function to transfer admin rights
(define-public (transfer-admin (new-admin principal))
  (begin
    (asserts! (is-eq tx-sender (var-get admin)) (err u100))
    (ok (var-set admin new-admin))
  )
)
