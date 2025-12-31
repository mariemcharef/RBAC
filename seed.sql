
-- Insert sample data

-- 1. Insert Tenants
INSERT INTO tenants (name) VALUES
('Acme Corporation'),
('Tech Innovations Inc'),
('Global Solutions Ltd');

-- 2. Insert Users
INSERT INTO users (auth_id, email) VALUES
(uuid_generate_v4(), 'admin@acme.com'),
(uuid_generate_v4(), 'john.doe@acme.com'),
(uuid_generate_v4(), 'jane.smith@acme.com'),
(uuid_generate_v4(), 'admin@techinnovations.com'),
(uuid_generate_v4(), 'developer@techinnovations.com'),
(uuid_generate_v4(), 'viewer@techinnovations.com'),
(uuid_generate_v4(), 'manager@globalsolutions.com'),
(uuid_generate_v4(), 'analyst@globalsolutions.com');

-- 3. Insert Permissions (Global)
INSERT INTO permissions (key, description) VALUES
('user.read', 'View users in the tenant'),
('user.create', 'Create new users'),
('user.update', 'Update user information'),
('user.delete', 'Delete users'),
('user.assign_role', 'Assign roles to users'),

('role.read', 'View roles in the tenant'),
('role.create', 'Create new roles'),
('role.update', 'Update role information'),
('role.delete', 'Delete roles'),

('permission.read', 'View permissions'),
('permission.assign', 'Assign permissions to roles'),
('permission.remove', 'Remove permissions from roles'),

('tenant.read', 'View tenant information'),
('tenant.update', 'Update tenant settings'),

('report.read', 'View reports'),
('report.create', 'Create reports'),
('report.export', 'Export reports');

-- 4. Insert Roles for Acme Corporation (Tenant 1)
INSERT INTO roles (tenant_id, name, description) VALUES
(1, 'Admin', 'Full access to all features and settings'),
(1, 'Manager', 'Can manage users and view reports'),
(1, 'Editor', 'Can create and edit content'),
(1, 'Viewer', 'Read-only access to content');

-- 5. Insert Roles for Tech Innovations Inc (Tenant 2)
INSERT INTO roles (tenant_id, name, description) VALUES
(2, 'Super Admin', 'Complete system access'),
(2, 'Developer', 'Development and deployment access'),
(2, 'QA Tester', 'Testing and quality assurance access'),
(2, 'Guest', 'Limited read access');

-- 6. Insert Roles for Global Solutions Ltd (Tenant 3)
INSERT INTO roles (tenant_id, name, description) VALUES
(3, 'Director', 'Executive level access'),
(3, 'Team Lead', 'Team management access'),
(3, 'Analyst', 'Data analysis and reporting access');

-- 7. Assign Permissions to Acme Corporation Roles
-- Admin gets all permissions
INSERT INTO role_permissions (role_id, permission_id)
SELECT 1, id FROM permissions;

-- Manager gets user and report permissions
INSERT INTO role_permissions (role_id, permission_id) VALUES
(2, 1),  -- user.read
(2, 5),  -- user.assign_role
(2, 6),  -- role.read
(2, 13), -- tenant.read
(2, 15), -- report.read
(2, 16), -- report.create
(2, 17); -- report.export

-- Editor gets basic permissions
INSERT INTO role_permissions (role_id, permission_id) VALUES
(3, 1),  -- user.read
(3, 6),  -- role.read
(3, 13), -- tenant.read
(3, 15); -- report.read

-- Viewer gets read-only permissions
INSERT INTO role_permissions (role_id, permission_id) VALUES
(4, 1),  -- user.read
(4, 6),  -- role.read
(4, 13), -- tenant.read
(4, 15); -- report.read

-- 8. Assign Permissions to Tech Innovations Roles
-- Super Admin gets all permissions
INSERT INTO role_permissions (role_id, permission_id)
SELECT 5, id FROM permissions;

-- Developer gets development-related permissions
INSERT INTO role_permissions (role_id, permission_id) VALUES
(6, 1),  -- user.read
(6, 6),  -- role.read
(6, 10), -- permission.read
(6, 13), -- tenant.read
(6, 15), -- report.read
(6, 16); -- report.create

-- QA Tester gets testing permissions
INSERT INTO role_permissions (role_id, permission_id) VALUES
(7, 1),  -- user.read
(7, 6),  -- role.read
(7, 15), -- report.read
(7, 16); -- report.create

-- Guest gets minimal permissions
INSERT INTO role_permissions (role_id, permission_id) VALUES
(8, 1),  -- user.read
(8, 15); -- report.read

-- 9. Assign Permissions to Global Solutions Roles
-- Director gets comprehensive permissions
INSERT INTO role_permissions (role_id, permission_id) VALUES
(9, 1),  -- user.read
(9, 2),  -- user.create
(9, 3),  -- user.update
(9, 5),  -- user.assign_role
(9, 6),  -- role.read
(9, 7),  -- role.create
(9, 8),  -- role.update
(9, 13), -- tenant.read
(9, 14), -- tenant.update
(9, 15), -- report.read
(9, 16), -- report.create
(9, 17); -- report.export

-- Team Lead gets management permissions
INSERT INTO role_permissions (role_id, permission_id) VALUES
(10, 1),  -- user.read
(10, 5),  -- user.assign_role
(10, 6),  -- role.read
(10, 13), -- tenant.read
(10, 15), -- report.read
(10, 16); -- report.create

-- Analyst gets reporting permissions
INSERT INTO role_permissions (role_id, permission_id) VALUES
(11, 1),  -- user.read
(11, 6),  -- role.read
(11, 13), -- tenant.read
(11, 15), -- report.read
(11, 16), -- report.create
(11, 17); -- report.export

-- 10. Assign Users to Roles
-- Acme Corporation users
INSERT INTO user_roles (user_id, role_id) VALUES
(1, 1), -- admin@acme.com -> Admin
(2, 2), -- john.doe@acme.com -> Manager
(3, 3); -- jane.smith@acme.com -> Editor

-- Tech Innovations users
INSERT INTO user_roles (user_id, role_id) VALUES
(4, 5), -- admin@techinnovations.com -> Super Admin
(5, 6), -- developer@techinnovations.com -> Developer
(6, 8); -- viewer@techinnovations.com -> Guest

-- Global Solutions users
INSERT INTO user_roles (user_id, role_id) VALUES
(7, 9),  -- manager@globalsolutions.com -> Director
(8, 11); -- analyst@globalsolutions.com -> Analyst

