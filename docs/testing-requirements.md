# Testing Strategy & Requirements

### Critical Testing Protocol

**MANDATORY**: All functionality MUST be tested with authenticated users, not just service roles. Row Level Security (RLS) policies only activate with real user authentication contexts.

### Authentication Context Testing

**Three Required Test Contexts:**
1. **Service Role** (`SUPABASE_SERVICE_ROLE_KEY`) - Admin operations, bypasses RLS
2. **Anonymous** (`SUPABASE_ANON_KEY`) - Public access, RLS enabled but no user context  
3. **Authenticated Users** (`SUPABASE_ANON_KEY` + auth.signIn) - Real user experience, RLS fully active

### Database Testing Requirements

**For ANY feature involving database queries with RLS policies:**

```javascript
// ❌ INSUFFICIENT - Service role bypasses RLS entirely
const supabase = createClient(url, serviceKey)

// ✅ REQUIRED - Test with real user authentication
const supabase = createClient(url, anonKey)
await supabase.auth.signInWithPassword({
  email: 'student1@university.edu',
  password: 'password123'
})
```

**Test User Accounts:**
- `student1@university.edu` / `password123` - Student role testing
- `educator1@university.edu` / `password123` - Educator role testing
- `admin@university.edu` / `password123` - Admin role testing

### RLS Policy Testing Checklist

When creating or modifying RLS policies, verify:
- [ ] **No circular dependencies** - Policy doesn't query the same table it protects
- [ ] **No cross-table recursion** - Avoid Table A → Table B → Table A patterns  
- [ ] **Authenticated user queries work** - Test exact queries users will run
- [ ] **Joins and nested queries function** - Complex queries often reveal RLS issues
- [ ] **Performance acceptable** - RLS can impact query performance

### Integration Testing Requirements

**Full User Journey Testing:**
1. User authentication (login/signup)
2. Dashboard data loading
3. Role-specific data access
4. Cross-table queries (teams → courses, projects → artifacts)
5. Real-time subscriptions
6. File uploads and permissions

### Debugging RLS Issues

**Symptoms of RLS Problems:**
- `42P17` infinite recursion errors
- Queries work with service role but fail with authenticated users
- Empty results for authenticated users who should have data access
- Timeout errors on complex queries

**Debugging Steps:**
1. Test query with service role (should work)
2. Test same query with authenticated user (may fail)
3. Check for circular policy dependencies
4. Use SECURITY DEFINER functions to break recursion chains
5. Verify policy names match exactly in migrations

### Test Script Pattern

```javascript
// Create reusable authentication test helper
async function testWithAuthenticatedUser(email, password, testFn) {
  const supabase = createClient(url, anonKey)
  
  const { error: authError } = await supabase.auth.signInWithPassword({
    email, password
  })
  
  if (authError) throw authError
  
  try {
    await testFn(supabase)
  } finally {
    await supabase.auth.signOut()
  }
}

// Use in tests
await testWithAuthenticatedUser('student1@university.edu', 'password123', async (supabase) => {
  const { data, error } = await supabase
    .from('teams_users')
    .select('team:teams(id, name, course:courses(name))')
  
  expect(error).toBeNull()
  expect(data).toBeDefined()
})
```

### Migration Testing

**After applying database migrations:**
1. Run dev server startup test
2. Test authenticated user dashboard access
3. Verify role-based data visibility
4. Check all cross-table queries function
5. Confirm no RLS recursion errors

### Performance Considerations

- RLS policies add WHERE clauses to every query
- Complex policies can significantly impact performance
- Use indexes on columns referenced in RLS policies
- Consider SECURITY DEFINER functions for complex authorization logic
- Monitor query performance with authenticated users, not just service role