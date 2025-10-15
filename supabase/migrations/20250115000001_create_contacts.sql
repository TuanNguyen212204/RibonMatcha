-- Create contacts table to store contact form submissions
CREATE TABLE contacts (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  email TEXT NOT NULL,
  message TEXT NOT NULL,
  status TEXT DEFAULT 'new' CHECK (status IN ('new', 'read', 'replied', 'archived')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE contacts ENABLE ROW LEVEL SECURITY;

-- Allow public to insert contact messages
CREATE POLICY "Public can insert contacts"
  ON contacts FOR INSERT
  WITH CHECK (true);

-- Allow admins to manage contacts
CREATE POLICY "Admins can manage contacts"
  ON contacts FOR ALL
  USING (has_role(auth.uid(), 'admin'));

-- Create index for performance
CREATE INDEX idx_contacts_status ON contacts(status);
CREATE INDEX idx_contacts_created_at ON contacts(created_at);

-- Add trigger for updated_at
CREATE TRIGGER update_contacts_updated_at 
  BEFORE UPDATE ON contacts
  FOR EACH ROW 
  EXECUTE FUNCTION update_updated_at_column();
