const mongoose = require('mongoose');
const OAuthClient = require('../models/OAuthClient');
const connectDB = require('../config/db');

/**
 * Script to register OAuth 2.0 clients
 * Run this to set up App B as an OAuth client
 * 
 * Usage: node src/scripts/registerClient.js
 */

const registerAppB = async () => {
  try {
    await connectDB();
    
    // Use fixed client ID that matches App B's configuration
    const CLIENT_ID = 'app-b-client';
    
    // Check if App B client already exists
    const existingClient = await OAuthClient.findOne({ clientId: CLIENT_ID });
    
    if (existingClient) {
      console.log('App B client already registered:');
      console.log('Client ID:', existingClient.clientId);
      console.log('\nTo re-register, delete the client first or use --force flag');
      
      // If --force flag, delete and recreate
      if (process.argv.includes('--force')) {
        await OAuthClient.deleteOne({ clientId: CLIENT_ID });
        console.log('Deleted existing client. Re-registering...\n');
      } else {
        process.exit(0);
      }
    }
    
    // Generate client secret only (use fixed clientId)
    const crypto = require('crypto');
    const clientSecret = crypto.randomBytes(32).toString('hex');
    
    // Create App B as OAuth client
    const client = await OAuthClient.create({
      clientId: CLIENT_ID,
      clientSecret: clientSecret,
      name: 'App B',
      redirectUris: [
        'http://localhost:3002/oauth/callback'
      ],
      grantTypes: ['authorization_code', 'refresh_token'],
      allowedScopes: ['openid', 'profile', 'email'],
      clientType: 'confidential', // App B has a backend, so confidential
      requirePkce: true, // Still require PKCE for extra security
      isActive: true
    });
    
    console.log('\n=== OAuth 2.0 Client Registered ===\n');
    console.log('Client Name:', client.name);
    console.log('Client ID:', client.clientId);
    console.log('Client Secret:', clientSecret);
    console.log('\nRedirect URIs:');
    client.redirectUris.forEach(uri => console.log('  -', uri));
    console.log('\nAllowed Scopes:', client.allowedScopes.join(', '));
    console.log('\n=== IMPORTANT ===');
    console.log('Add these to App B server .env file:');
    console.log(`OAUTH_CLIENT_ID=${client.clientId}`);
    console.log(`OAUTH_CLIENT_SECRET=${clientSecret}`);
    console.log('\n');
    
    process.exit(0);
  } catch (error) {
    console.error('Error registering client:', error);
    process.exit(1);
  }
};

registerAppB();
