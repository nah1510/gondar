package family

import (
	"time"
)

// FamilyMember đại diện cho một người trong gia phả
type FamilyMember struct {
	ID        string     `json:"id"`
	FullName  string     `json:"full_name"`
	Nickname  string     `json:"nickname"`
	Gender    string     `json:"gender"` // male, female
	BirthDate string     `json:"birth_date"` // YYYY-MM-DD
	Phone     string     `json:"phone"`
	Address   string     `json:"address"`
	FatherID  *string    `json:"father_id"`
	MotherID  *string    `json:"mother_id"`
	SpouseID  *string    `json:"spouse_id"`
	IsAlive   bool       `json:"is_alive"`
	
	// Authentication fields
	Username     *string `json:"username,omitempty"`
	Email        *string `json:"email,omitempty"`
	PasswordHash *string `json:"-"` // Không trả về client
	Role         string  `json:"role"` // admin, member

	CreatedAt *time.Time `json:"created_at,omitempty"`
	UpdatedAt *time.Time `json:"updated_at,omitempty"`
}
