-- EXTENSION
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- COMPANIES
CREATE TABLE companies (
 id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
 name TEXT NOT NULL,
 created_at TIMESTAMP DEFAULT now()
);

-- USERS
CREATE TABLE users (
 id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
 company_id uuid REFERENCES companies(id),
 email TEXT UNIQUE NOT NULL,
 name TEXT,
 role TEXT,
 created_at TIMESTAMP DEFAULT now()
);

-- CLIENTS
CREATE TABLE clients (
 id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
 company_id uuid REFERENCES companies(id),
 name TEXT NOT NULL,
 industry TEXT,
 country TEXT,
 created_at TIMESTAMP DEFAULT now()
);

-- CONTACTS
CREATE TABLE contacts (
 id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
 client_id uuid REFERENCES clients(id),
 name TEXT,
 email TEXT,
 phone TEXT
);

-- OPPORTUNITIES
CREATE TABLE opportunities (
 id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
 company_id uuid REFERENCES companies(id),
 client_id uuid REFERENCES clients(id),
 salesperson_id uuid REFERENCES users(id),
 stage TEXT,
 estimated_value NUMERIC,
 created_at TIMESTAMP DEFAULT now()
);

-- QUOTATIONS
CREATE TABLE quotations (
 id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
 opportunity_id uuid REFERENCES opportunities(id),
 service_type TEXT,
 origin TEXT,
 destination TEXT,
 cargo_type TEXT,
 weight NUMERIC,
 volume NUMERIC,
 total_price NUMERIC,
 status TEXT,
 created_at TIMESTAMP DEFAULT now()
);

-- SHIPMENTS
CREATE TABLE shipments (
 id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
 quotation_id uuid REFERENCES quotations(id),
 shipment_number TEXT,
 status TEXT,
 departure_date DATE,
 arrival_date DATE
);

-- COSTS
CREATE TABLE shipment_costs (
 id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
 shipment_id uuid REFERENCES shipments(id),
 vendor TEXT,
 cost_type TEXT,
 amount NUMERIC
);

-- INVOICES
CREATE TABLE invoices (
 id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
 shipment_id uuid REFERENCES shipments(id),
 invoice_number TEXT,
 total NUMERIC,
 issued_date DATE
);

-- COMMISSIONS
CREATE TABLE commissions (
 id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
 shipment_id uuid REFERENCES shipments(id),
 salesperson_id uuid REFERENCES users(id),
 commission_percentage NUMERIC,
 commission_amount NUMERIC
);