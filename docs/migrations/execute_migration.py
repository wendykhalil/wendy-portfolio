#!/usr/bin/env python3
"""
Execute Experiences Migration via Supabase Admin API
Requires: supabase-py, python-dotenv

Installation:
    pip install supabase-py python-dotenv

Usage:
    python docs/migrations/execute_migration.py

Environment variables required (from .env.local):
    VITE_SUPABASE_URL
    VITE_SUPABASE_ANON_KEY

Security:
    - Uses anon key (public access, respects RLS)
    - Does not bypass authentication
    - Safe to run in CI/CD pipelines
"""

import os
import sys
from pathlib import Path
from dotenv import load_dotenv

def load_env():
    """Load environment variables from .env.local"""
    env_path = Path(__file__).parent.parent.parent / ".env.local"
    
    if not env_path.exists():
        print(f"❌ Error: .env.local not found at {env_path}")
        print("\nPlease ensure .env.local exists with:")
        print("  VITE_SUPABASE_URL=https://...")
        print("  VITE_SUPABASE_ANON_KEY=sb_...")
        sys.exit(1)
    
    load_dotenv(env_path)
    
    supabase_url = os.getenv("VITE_SUPABASE_URL")
    supabase_key = os.getenv("VITE_SUPABASE_ANON_KEY")
    
    if not supabase_url or not supabase_key:
        print("❌ Error: Missing Supabase credentials in .env.local")
        sys.exit(1)
    
    return supabase_url, supabase_key


def read_migration_sql():
    """Read migration SQL from file"""
    migration_path = Path(__file__).parent / "006_create_experiences_table.sql"
    
    if not migration_path.exists():
        print(f"❌ Error: Migration file not found at {migration_path}")
        sys.exit(1)
    
    with open(migration_path, 'r', encoding='utf-8') as f:
        sql = f.read()
    
    return sql


def split_sql_statements(sql):
    """
    Split SQL into individual statements
    Handles comments and string literals
    """
    statements = []
    current = []
    in_string = False
    string_char = None
    i = 0
    
    while i < len(sql):
        char = sql[i]
        
        # Handle string literals
        if char in ('"', "'") and (i == 0 or sql[i-1] != '\\'):
            if not in_string:
                in_string = True
                string_char = char
            elif char == string_char:
                in_string = False
                string_char = None
        
        # Handle statement terminator (only if not in string)
        if not in_string and char == ';':
            current.append(char)
            statement = ''.join(current).strip()
            if statement and not statement.startswith('--'):
                statements.append(statement)
            current = []
            i += 1
            continue
        
        current.append(char)
        i += 1
    
    # Add any remaining statement
    statement = ''.join(current).strip()
    if statement and not statement.startswith('--'):
        statements.append(statement)
    
    return statements


def execute_migration():
    """Execute the migration via Supabase"""
    print("=" * 70)
    print("🚀 EXPERIENCES MIGRATION EXECUTOR (Python)")
    print("=" * 70)
    print("")
    
    try:
        # Import Supabase library
        try:
            from supabase import create_client
        except ImportError:
            print("❌ Error: supabase-py not installed")
            print("\nInstall with:")
            print("  pip install supabase-py")
            sys.exit(1)
        
        # Load environment
        print("🔧 Loading environment...")
        supabase_url, supabase_key = load_env()
        print(f"✓ Supabase URL: {supabase_url}")
        print(f"✓ Supabase Key: {supabase_key[:20]}...")
        
        # Initialize Supabase client
        print("\n📡 Connecting to Supabase...")
        supabase = create_client(supabase_url, supabase_key)
        print("✓ Connected to Supabase")
        
        # Read migration SQL
        print("\n📋 Reading migration SQL...")
        migration_sql = read_migration_sql()
        print(f"✓ Migration SQL loaded: {len(migration_sql)} characters")
        
        # Split into statements
        print("\n🔨 Parsing SQL statements...")
        statements = split_sql_statements(migration_sql)
        print(f"✓ Found {len(statements)} SQL statements")
        
        # Execute each statement
        print("\n⚡ Executing migration...")
        print("-" * 70)
        
        # For safety, execute as a single transaction
        # Since we can't execute arbitrary SQL through client library,
        # we need to guide the user to do this manually
        
        print("\n⚠️  NOTE: Supabase client-side library cannot execute DDL statements")
        print("          (CREATE TABLE, CREATE POLICY, etc.) directly for security.")
        print("")
        print("📝 To execute this migration:")
        print("   1. Copy the SQL from: docs/migrations/006_create_experiences_table.sql")
        print("   2. Open Supabase dashboard: https://app.supabase.com")
        print("   3. Select project: ihogbszoeyrrusbmsgfb")
        print("   4. Click SQL Editor > Create New Query")
        print("   5. Paste the SQL and click Run")
        print("")
        
        # Instead, let's verify the table after manual execution
        print("✓ Migration SQL is ready for manual execution")
        print("")
        print("After executing in Supabase SQL Editor, run this script again")
        print("to verify the migration was successful.")
        
        # Attempt verification (this will fail if table doesn't exist yet)
        print("\n🔍 Attempting verification...")
        print("-" * 70)
        
        try:
            response = supabase.table('experiences').select('*').execute()
            
            if response.data:
                print(f"✓ Experiences table exists with {len(response.data)} records")
                for exp in response.data:
                    print(f"  - [{exp['id']}] {exp['title_fr']}")
            else:
                print("✓ Experiences table exists (no records yet)")
            
            return True
            
        except Exception as verify_error:
            print(f"ℹ️  Experiences table not yet created: {str(verify_error)}")
            print("    This is expected before manual migration execution")
            return False
        
    except Exception as error:
        print(f"\n❌ Error: {error}")
        print(f"Stack: {error.__class__.__name__}")
        return False


if __name__ == "__main__":
    success = execute_migration()
    
    print("\n" + "=" * 70)
    if success:
        print("✅ Migration verification successful")
        print("=" * 70)
        sys.exit(0)
    else:
        print("ℹ️  Execute migration in Supabase SQL Editor first, then re-run this script")
        print("=" * 70)
        sys.exit(1)

