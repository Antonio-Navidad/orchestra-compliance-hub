
-- Create role enum
CREATE TYPE public.app_role AS ENUM ('admin', 'ops_manager', 'analyst', 'viewer');

-- Create user_roles table
CREATE TABLE public.user_roles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  role app_role NOT NULL,
  granted_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  granted_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, role)
);

ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

-- Security definer function to check roles without RLS recursion
CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role app_role)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = _user_id AND role = _role
  )
$$;

-- Helper: check if user has any admin-level role
CREATE OR REPLACE FUNCTION public.is_admin(_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = _user_id AND role = 'admin'
  )
$$;

-- RLS: everyone can read roles (needed for UI)
CREATE POLICY "Roles viewable by authenticated"
ON public.user_roles FOR SELECT TO authenticated
USING (true);

-- RLS: only admins can insert roles
CREATE POLICY "Admins can insert roles"
ON public.user_roles FOR INSERT TO authenticated
WITH CHECK (public.is_admin(auth.uid()));

-- RLS: only admins can delete roles
CREATE POLICY "Admins can delete roles"
ON public.user_roles FOR DELETE TO authenticated
USING (public.is_admin(auth.uid()));

-- RLS: only admins can update roles
CREATE POLICY "Admins can update roles"
ON public.user_roles FOR UPDATE TO authenticated
USING (public.is_admin(auth.uid()));

-- Update profiles RLS so admins can view all profiles
DROP POLICY IF EXISTS "Users can view own profile" ON public.profiles;
CREATE POLICY "Users can view profiles"
ON public.profiles FOR SELECT TO authenticated
USING (auth.uid() = id OR public.is_admin(auth.uid()));
