"use client"

import { apiClient } from '@/lib/services/api-client'

/**
 * Test function to verify 401 handling works correctly
 * This can be called from the browser console for testing
 */
export async function test401Handling() {
  try {
    console.log('Testing 401 handling...')
    
    // Set an invalid token to trigger 401
    localStorage.setItem('auth_token', 'invalid-token-for-testing')
    
    // Make a request that requires authentication
    await apiClient.get('/auth/user')
    
    console.log('Unexpected: Request succeeded with invalid token')
  } catch (error) {
    console.log('Expected: Request failed with 401 error')
    console.log('Error:', error)
  }
}

/**
 * Test function to verify normal API calls still work
 */
export async function testNormalApiCall() {
  try {
    console.log('Testing normal API call...')
    
    // This should work if user is properly authenticated
    const response = await apiClient.get('/auth/user')
    console.log('API call successful:', response)
  } catch (error) {
    console.log('API call failed:', error)
  }
}
