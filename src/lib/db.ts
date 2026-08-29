import { Pool } from 'pg';
import 'dotenv/config';

const connectionString = process.env.DATABASE_URL;

const isProduction = process.env.NODE_ENV === 'production' || connectionString?.includes('render.com');

export const pool = new Pool({
  connectionString,
  ssl: isProduction ? { rejectUnauthorized: false } : false,
});

export async function initDb() {
  const client = await pool.connect();
  try {
    await client.query(`
      CREATE TABLE IF NOT EXISTS users (
        id SERIAL PRIMARY KEY,
        email VARCHAR(255) UNIQUE NOT NULL,
        password VARCHAR(255) NOT NULL,
        name VARCHAR(255),
        role VARCHAR(50) NOT NULL DEFAULT 'RESIDENT',
        phone VARCHAR(50),
        status VARCHAR(50) NOT NULL DEFAULT 'ACTIVE',
        block VARCHAR(50),
        building VARCHAR(50),
        apartment VARCHAR(50),
        resident_type VARCHAR(50),
        failed_login_count INT NOT NULL DEFAULT 0,
        is_locked BOOLEAN NOT NULL DEFAULT FALSE,
        locked_at TIMESTAMP WITH TIME ZONE,
        must_change_password BOOLEAN NOT NULL DEFAULT FALSE,
        created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS access_requests (
        id SERIAL PRIMARY KEY,
        full_name VARCHAR(255) NOT NULL,
        block VARCHAR(50) NOT NULL,
        building VARCHAR(50) NOT NULL,
        apartment VARCHAR(50) NOT NULL,
        resident_type VARCHAR(50) NOT NULL,
        phone VARCHAR(50) NOT NULL,
        whatsapp VARCHAR(50) NOT NULL,
        email VARCHAR(255) UNIQUE NOT NULL,
        status VARCHAR(50) NOT NULL DEFAULT 'PENDING',
        created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS properties (
        id SERIAL PRIMARY KEY,
        title VARCHAR(255) NOT NULL,
        description TEXT,
        full_description TEXT,
        property_type VARCHAR(50) NOT NULL DEFAULT 'apartment',
        transaction_type VARCHAR(50) NOT NULL DEFAULT 'sale',
        price DOUBLE PRECISION,
        area DOUBLE PRECISION,
        bedrooms INT NOT NULL DEFAULT 0,
        bathrooms INT NOT NULL DEFAULT 0,
        parking_spots INT NOT NULL DEFAULT 0,
        block VARCHAR(50),
        building VARCHAR(50),
        apartment_number VARCHAR(50),
        address VARCHAR(255),
        neighborhood VARCHAR(255),
        city VARCHAR(255),
        state VARCHAR(50),
        zip_code VARCHAR(50),
        features TEXT,
        image_url TEXT,
        gallery_urls TEXT,
        is_featured BOOLEAN NOT NULL DEFAULT FALSE,
        is_active BOOLEAN NOT NULL DEFAULT TRUE,
        owner_name VARCHAR(255),
        owner_whatsapp VARCHAR(50),
        user_id INT,
        created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS unidades (
        id SERIAL PRIMARY KEY,
        ord INT NOT NULL,
        bloco INT NOT NULL,
        edificio INT NOT NULL,
        apartamento INT NOT NULL,
        nome VARCHAR(255) NOT NULL,
        contacto VARCHAR(255) NOT NULL DEFAULT '',
        via VARCHAR(255) NOT NULL DEFAULT '',
        categoria VARCHAR(50) NOT NULL DEFAULT 'quitadas',
        divida_anterior DOUBLE PRECISION NOT NULL DEFAULT 0,
        pagamentos_historicos DOUBLE PRECISION NOT NULL DEFAULT 0,
        user_id INT,
        created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS condominium_fees (
        id SERIAL PRIMARY KEY,
        unidade_id INT NOT NULL REFERENCES unidades(id) ON DELETE CASCADE,
        reference_month INT NOT NULL,
        reference_year INT NOT NULL,
        amount DOUBLE PRECISION NOT NULL DEFAULT 0,
        valor_pago DOUBLE PRECISION NOT NULL DEFAULT 0,
        due_date TIMESTAMP WITH TIME ZONE NOT NULL,
        status VARCHAR(50) NOT NULL DEFAULT 'PENDING',
        paid_at TIMESTAMP WITH TIME ZONE,
        payment_method VARCHAR(50),
        receipt_url TEXT,
        created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
        CONSTRAINT unique_unidade_year_month UNIQUE (unidade_id, reference_year, reference_month)
      );

      CREATE TABLE IF NOT EXISTS fee_payments (
        id SERIAL PRIMARY KEY,
        fee_id INT NOT NULL REFERENCES condominium_fees(id) ON DELETE CASCADE,
        amount DOUBLE PRECISION NOT NULL,
        payment_method VARCHAR(50) NOT NULL,
        payment_date TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
        notes TEXT,
        created_by_user_id INT,
        created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS fpd_unidades (
        id SERIAL PRIMARY KEY,
        ord INT NOT NULL DEFAULT 1,
        apartamento INT NOT NULL,
        nome VARCHAR(255) NOT NULL,
        contacto VARCHAR(255) NOT NULL DEFAULT '',
        taxa DOUBLE PRECISION NOT NULL DEFAULT 1000,
        divida_anterior DOUBLE PRECISION NOT NULL DEFAULT 0,
        pagamentos_historicos DOUBLE PRECISION NOT NULL DEFAULT 0,
        user_id INT,
        created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS fpd_fees (
        id SERIAL PRIMARY KEY,
        unidade_id INT NOT NULL REFERENCES fpd_unidades(id) ON DELETE CASCADE,
        reference_month INT NOT NULL,
        reference_year INT NOT NULL,
        amount DOUBLE PRECISION NOT NULL DEFAULT 1000,
        valor_pago DOUBLE PRECISION NOT NULL DEFAULT 0,
        due_date TIMESTAMP WITH TIME ZONE NOT NULL,
        status VARCHAR(50) NOT NULL DEFAULT 'PENDING',
        paid_at TIMESTAMP WITH TIME ZONE,
        payment_method VARCHAR(50),
        receipt_url TEXT,
        created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
        CONSTRAINT unique_fpd_unidade_year_month UNIQUE (unidade_id, reference_year, reference_month)
      );

      CREATE TABLE IF NOT EXISTS fpd_fee_payments (
        id SERIAL PRIMARY KEY,
        fee_id INT NOT NULL REFERENCES fpd_fees(id) ON DELETE CASCADE,
        amount DOUBLE PRECISION NOT NULL,
        payment_method VARCHAR(50) NOT NULL,
        payment_date TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
        notes TEXT,
        created_by_user_id INT,
        created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS institution_fees (
        id SERIAL PRIMARY KEY,
        institution VARCHAR(255) NOT NULL,
        reference_year INT NOT NULL,
        reference_month INT NOT NULL,
        period_label VARCHAR(255) NOT NULL,
        descricao VARCHAR(255) NOT NULL DEFAULT 'Taxa de condomínio',
        taxa DOUBLE PRECISION NOT NULL DEFAULT 1000,
        n_apartamentos INT NOT NULL DEFAULT 0,
        valor DOUBLE PRECISION NOT NULL DEFAULT 0,
        valor_pago DOUBLE PRECISION NOT NULL DEFAULT 0,
        status VARCHAR(50) NOT NULL DEFAULT 'PENDING',
        paid_at TIMESTAMP WITH TIME ZONE,
        payment_method VARCHAR(50),
        created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
        CONSTRAINT unique_inst_year_month UNIQUE (institution, reference_year, reference_month)
      );

      CREATE TABLE IF NOT EXISTS institution_payments (
        id SERIAL PRIMARY KEY,
        fee_id INT NOT NULL REFERENCES institution_fees(id) ON DELETE CASCADE,
        institution VARCHAR(255) NOT NULL,
        amount DOUBLE PRECISION NOT NULL,
        payment_method VARCHAR(50) NOT NULL,
        payment_date TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
        reference VARCHAR(255),
        notes TEXT,
        created_by_user_id INT,
        created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS documents (
        id SERIAL PRIMARY KEY,
        title VARCHAR(255) NOT NULL,
        description TEXT,
        category VARCHAR(255) NOT NULL,
        folder VARCHAR(255) DEFAULT 'Geral',
        year INT,
        file_url TEXT NOT NULL,
        file_name VARCHAR(255) NOT NULL,
        file_size VARCHAR(50),
        file_type VARCHAR(50),
        created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS document_downloads (
        id SERIAL PRIMARY KEY,
        document_id INT NOT NULL REFERENCES documents(id) ON DELETE CASCADE,
        downloaded_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
        user_agent TEXT,
        ip_address VARCHAR(100)
      );

      CREATE TABLE IF NOT EXISTS news (
        id SERIAL PRIMARY KEY,
        title VARCHAR(255) NOT NULL,
        summary TEXT NOT NULL,
        content TEXT NOT NULL,
        category VARCHAR(255) NOT NULL,
        image_url TEXT,
        gallery_urls TEXT,
        created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS notices (
        id SERIAL PRIMARY KEY,
        title VARCHAR(255) NOT NULL,
        content TEXT NOT NULL,
        priority VARCHAR(50) NOT NULL DEFAULT 'normal',
        is_active BOOLEAN NOT NULL DEFAULT TRUE,
        created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS messages (
        id SERIAL PRIMARY KEY,
        sender_id INT NOT NULL,
        recipient_id INT NOT NULL,
        is_from_admin BOOLEAN NOT NULL DEFAULT FALSE,
        content TEXT,
        attachment_url TEXT,
        attachment_name VARCHAR(255),
        attachment_type VARCHAR(50),
        read_at TIMESTAMP WITH TIME ZONE,
        created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS about_gallery (
        id SERIAL PRIMARY KEY,
        image_url TEXT NOT NULL,
        title VARCHAR(255),
        display_order INT NOT NULL DEFAULT 0,
        created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS common_areas (
        id SERIAL PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        description TEXT,
        capacity INT NOT NULL DEFAULT 20,
        rules TEXT,
        created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS reservations (
        id SERIAL PRIMARY KEY,
        user_id INT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        area_id INT NOT NULL REFERENCES common_areas(id) ON DELETE CASCADE,
        reservation_date DATE NOT NULL,
        start_time VARCHAR(10) NOT NULL,
        end_time VARCHAR(10) NOT NULL,
        status VARCHAR(50) NOT NULL DEFAULT 'pending',
        notes TEXT,
        created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS marketplace_services (
        id SERIAL PRIMARY KEY,
        user_id INT REFERENCES users(id) ON DELETE SET NULL,
        owner_name VARCHAR(255) NOT NULL,
        business_name VARCHAR(255) NOT NULL,
        category VARCHAR(100) NOT NULL,
        phone VARCHAR(50) NOT NULL,
        email VARCHAR(255),
        location VARCHAR(255),
        description TEXT NOT NULL,
        full_description TEXT,
        hours VARCHAR(255),
        image_url TEXT,
        status VARCHAR(50) NOT NULL DEFAULT 'pending',
        created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP
      );
    `);
    console.log('Database tables verified/initialized successfully.');

    // Seed default common areas if empty
    const areaCheck = await client.query('SELECT COUNT(*) as count FROM common_areas');
    if (parseInt(areaCheck.rows[0].count, 10) === 0) {
      await client.query(`
        INSERT INTO common_areas (name, description, capacity, rules) VALUES
        ('Salão de Festas Principal', 'Espaço climatizado com mesas, cadeiras e cozinha de apoio.', 100, 'Proibido som alto após as 22h. Limpeza inclusa na taxa.'),
        ('Churrasqueira / Espaço Gourmet', 'Área externa com churrasqueira, bancada e grelha.', 30, 'Manter o local limpo após o uso.'),
        ('Campo Polidesportivo', 'Campo multiuso para futebol de salão e basquetebol.', 25, 'Uso com calçado apropriado.'),
        ('Piscina do Condomínio', 'Área de lazer com piscina para adultos e crianças.', 50, 'Menores devem estar acompanhados por responsáveis.')
      `);
      console.log('Seed: Default common areas created.');
    }

    // Seed Admin User
    const adminEmail = 'efata@gmail.com';
    const bcrypt = require('bcryptjs');
    const hashedPassword = await bcrypt.hash('12345678', 10);

    const existingAdmin = await client.query('SELECT id FROM users WHERE email = $1', [adminEmail]);
    if (existingAdmin.rows.length === 0) {
      await client.query(
        `INSERT INTO users (email, password, name, role, status)
         VALUES ($1, $2, $3, $4, $5)`,
        [adminEmail, hashedPassword, 'Administrador', 'ADMIN', 'ACTIVE']
      );
      console.log('Seed: Admin user efata@gmail.com created successfully.');
    } else {
      await client.query(
        `UPDATE users
         SET password = $1, role = 'ADMIN', status = 'ACTIVE', is_locked = false, failed_login_count = 0, updated_at = NOW()
         WHERE email = $2`,
        [hashedPassword, adminEmail]
      );
      console.log('Seed: Admin user efata@gmail.com updated successfully.');
    }
  } catch (err) {
    console.error('Error initializing database tables/seed:', err);
  } finally {
    client.release();
  }
}
