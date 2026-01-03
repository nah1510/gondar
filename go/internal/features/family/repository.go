package family

import (
	"context"
	"timo/internal/database"
)

// Repository chịu trách nhiệm truy xuất dữ liệu gia phả từ Supabase (PostgreSQL)
type Repository struct {
	db *database.DB
}

func NewRepository(db *database.DB) *Repository {
	return &Repository{db: db}
}

// GetAll trả về danh sách tất cả thành viên trong gia đình
func (r *Repository) GetAll(ctx context.Context) ([]FamilyMember, error) {
	if r.db == nil || r.db.Pool == nil {
		return []FamilyMember{}, nil // Mock hoặc bỏ qua nếu DB chưa config
	}

	query := `
		SELECT id, full_name, COALESCE(nickname, ''), gender, TO_CHAR(birth_date, 'YYYY-MM-DD'), COALESCE(phone, ''), COALESCE(address, ''), father_id, mother_id, spouse_id, COALESCE(is_alive, true), username, email, password_hash, COALESCE(role, 'member'), created_at, updated_at
		FROM family_members
		ORDER BY birth_date ASC
	`
	rows, err := r.db.Pool.Query(ctx, query)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var members []FamilyMember
	for rows.Next() {
		var m FamilyMember
		var bDate *string
		err := rows.Scan(
			&m.ID, &m.FullName, &m.Nickname, &m.Gender, &bDate, &m.Phone, &m.Address,
			&m.FatherID, &m.MotherID, &m.SpouseID, &m.IsAlive, &m.Username, &m.Email, &m.PasswordHash, &m.Role, &m.CreatedAt, &m.UpdatedAt,
		)
		if err != nil {
			return nil, err
		}
		if bDate != nil {
			m.BirthDate = *bDate
		}
		members = append(members, m)
	}
	return members, nil
}

// Create thêm một thành viên mới
func (r *Repository) Create(ctx context.Context, m *FamilyMember) error {
	if r.db == nil || r.db.Pool == nil {
		return nil
	}

	if m.Role == "" {
		m.Role = "member"
	}

	tx, err := r.db.Pool.Begin(ctx)
	if err != nil {
		return err
	}
	defer tx.Rollback(ctx)

	query := `
		INSERT INTO family_members (full_name, nickname, gender, birth_date, phone, address, father_id, mother_id, spouse_id, is_alive, username, email, password_hash, role)
		VALUES ($1, $2, $3, NULLIF($4::text, '')::DATE, $5, $6, NULLIF($7::text, '')::UUID, NULLIF($8::text, '')::UUID, NULLIF($9::text, '')::UUID, $10, $11, $12, $13, $14)
		RETURNING id, created_at, updated_at
	`
	err = tx.QueryRow(ctx, query,
		m.FullName, m.Nickname, m.Gender, m.BirthDate, m.Phone, m.Address,
		m.FatherID, m.MotherID, m.SpouseID, m.IsAlive, m.Username, m.Email, m.PasswordHash, m.Role,
	).Scan(&m.ID, &m.CreatedAt, &m.UpdatedAt)
	if err != nil {
		return err
	}

	// Đồng bộ Vợ/Chồng 2 chiều
	if m.SpouseID != nil && *m.SpouseID != "" {
		_, err = tx.Exec(ctx, `UPDATE family_members SET spouse_id = $1 WHERE id = $2`, m.ID, *m.SpouseID)
		if err != nil { return err }
		_, err = tx.Exec(ctx, `UPDATE family_members SET spouse_id = NULL WHERE spouse_id = $1 AND id != $2`, *m.SpouseID, m.ID)
		if err != nil { return err }
	}

	return tx.Commit(ctx)
}

// Update cập nhật thông tin thành viên
func (r *Repository) Update(ctx context.Context, m *FamilyMember) error {
	if r.db == nil || r.db.Pool == nil {
		return nil
	}

	tx, err := r.db.Pool.Begin(ctx)
	if err != nil {
		return err
	}
	defer tx.Rollback(ctx)

	query := `
		UPDATE family_members
		SET full_name = $1, nickname = $2, gender = $3, birth_date = NULLIF($4::text, '')::DATE, 
		    phone = $5, address = $6, father_id = NULLIF($7::text, '')::UUID, mother_id = NULLIF($8::text, '')::UUID, spouse_id = NULLIF($9::text, '')::UUID, is_alive = $10,
			username = COALESCE($11, username), email = COALESCE($12, email), password_hash = COALESCE($13, password_hash), updated_at = NOW()
		WHERE id = $14
	`
	_, err = tx.Exec(ctx, query,
		m.FullName, m.Nickname, m.Gender, m.BirthDate, m.Phone, m.Address,
		m.FatherID, m.MotherID, m.SpouseID, m.IsAlive, m.Username, m.Email, m.PasswordHash, m.ID,
	)
	if err != nil {
		return err
	}

	// Đồng bộ Vợ/Chồng 2 chiều
	if m.SpouseID != nil && *m.SpouseID != "" {
		// 1. Set the new spouse's spouse_id to this member
		_, err = tx.Exec(ctx, `UPDATE family_members SET spouse_id = $1 WHERE id = $2`, m.ID, *m.SpouseID)
		if err != nil { return err }
		// 2. Remove this member from their OLD spouse (anyone who has spouse_id = m.ID but is not the NEW spouse)
		_, err = tx.Exec(ctx, `UPDATE family_members SET spouse_id = NULL WHERE spouse_id = $1 AND id != $2`, m.ID, *m.SpouseID)
		if err != nil { return err }
		// 3. Remove the NEW spouse from their OLD spouse (anyone who has spouse_id = m.SpouseID but is not m.ID)
		_, err = tx.Exec(ctx, `UPDATE family_members SET spouse_id = NULL WHERE spouse_id = $1 AND id != $2`, *m.SpouseID, m.ID)
		if err != nil { return err }
	} else {
		// If spouse is set to NULL, remove this member from anyone who had them as spouse
		_, err = tx.Exec(ctx, `UPDATE family_members SET spouse_id = NULL WHERE spouse_id = $1`, m.ID)
		if err != nil { return err }
	}

	return tx.Commit(ctx)
}

// Delete xóa một thành viên
func (r *Repository) Delete(ctx context.Context, id string) error {
	if r.db == nil || r.db.Pool == nil {
		return nil
	}
	query := `DELETE FROM family_members WHERE id = $1`
	_, err := r.db.Pool.Exec(ctx, query, id)
	return err
}

// GetByUsername tìm thành viên theo username
func (r *Repository) GetByUsername(ctx context.Context, username string) (*FamilyMember, error) {
	if r.db == nil || r.db.Pool == nil {
		return nil, nil
	}
	query := `
		SELECT id, full_name, COALESCE(nickname, ''), gender, TO_CHAR(birth_date, 'YYYY-MM-DD'), COALESCE(phone, ''), COALESCE(address, ''), father_id, mother_id, spouse_id, COALESCE(is_alive, true), username, email, password_hash, COALESCE(role, 'member'), created_at, updated_at
		FROM family_members WHERE username = $1 LIMIT 1
	`
	var m FamilyMember
	var bDate *string
	err := r.db.Pool.QueryRow(ctx, query, username).Scan(
		&m.ID, &m.FullName, &m.Nickname, &m.Gender, &bDate, &m.Phone, &m.Address,
		&m.FatherID, &m.MotherID, &m.SpouseID, &m.IsAlive, &m.Username, &m.Email, &m.PasswordHash, &m.Role, &m.CreatedAt, &m.UpdatedAt,
	)
	if err != nil {
		return nil, err
	}
	if bDate != nil { m.BirthDate = *bDate }
	return &m, nil
}

// GetByEmail tìm thành viên theo email
func (r *Repository) GetByEmail(ctx context.Context, email string) (*FamilyMember, error) {
	if r.db == nil || r.db.Pool == nil {
		return nil, nil
	}
	query := `
		SELECT id, full_name, COALESCE(nickname, ''), gender, TO_CHAR(birth_date, 'YYYY-MM-DD'), COALESCE(phone, ''), COALESCE(address, ''), father_id, mother_id, spouse_id, COALESCE(is_alive, true), username, email, password_hash, COALESCE(role, 'member'), created_at, updated_at
		FROM family_members WHERE email = $1 LIMIT 1
	`
	var m FamilyMember
	var bDate *string
	err := r.db.Pool.QueryRow(ctx, query, email).Scan(
		&m.ID, &m.FullName, &m.Nickname, &m.Gender, &bDate, &m.Phone, &m.Address,
		&m.FatherID, &m.MotherID, &m.SpouseID, &m.IsAlive, &m.Username, &m.Email, &m.PasswordHash, &m.Role, &m.CreatedAt, &m.UpdatedAt,
	)
	if err != nil {
		return nil, err
	}
	if bDate != nil { m.BirthDate = *bDate }
	return &m, nil
}

// GetByID tìm thành viên theo ID
func (r *Repository) GetByID(ctx context.Context, id string) (*FamilyMember, error) {
	if r.db == nil || r.db.Pool == nil {
		return nil, nil
	}
	query := `
		SELECT id, full_name, COALESCE(nickname, ''), gender, TO_CHAR(birth_date, 'YYYY-MM-DD'), COALESCE(phone, ''), COALESCE(address, ''), father_id, mother_id, spouse_id, COALESCE(is_alive, true), username, email, password_hash, COALESCE(role, 'member'), created_at, updated_at
		FROM family_members WHERE id = $1 LIMIT 1
	`
	var m FamilyMember
	var bDate *string
	err := r.db.Pool.QueryRow(ctx, query, id).Scan(
		&m.ID, &m.FullName, &m.Nickname, &m.Gender, &bDate, &m.Phone, &m.Address,
		&m.FatherID, &m.MotherID, &m.SpouseID, &m.IsAlive, &m.Username, &m.Email, &m.PasswordHash, &m.Role, &m.CreatedAt, &m.UpdatedAt,
	)
	if err != nil {
		return nil, err
	}
	if bDate != nil { m.BirthDate = *bDate }
	return &m, nil
}
