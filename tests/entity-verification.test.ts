import { describe, it, expect, beforeEach, vi } from 'vitest';

// Mock the Clarity VM environment
const mockClarity = {
  tx: {
    sender: 'ST1PQHQKV0RJXZFY1DGX8MNSNYVE3VGZJSRTPGZGM', // Mock admin address
    setSender: (sender: string) => { mockClarity.tx.sender = sender; }
  },
  blockHeight: 100,
  setBlockHeight: (height: number) => { mockClarity.blockHeight = height; },
  
  // Mock contract state
  state: {
    admin: 'ST1PQHQKV0RJXZFY1DGX8MNSNYVE3VGZJSRTPGZGM',
    verifiedEntities: new Map()
  },
  
  // Mock contract functions
  functions: {
    registerEntity: (entity: string, name: string, industry: string) => {
      if (mockClarity.tx.sender !== mockClarity.state.admin) {
        return { err: 100 }; // Not admin
      }
      
      if (mockClarity.state.verifiedEntities.has(entity)) {
        return { err: 101 }; // Already registered
      }
      
      mockClarity.state.verifiedEntities.set(entity, {
        name,
        industry,
        verificationDate: mockClarity.blockHeight,
        isActive: true
      });
      
      return { ok: true };
    },
    
    deactivateEntity: (entity: string) => {
      if (mockClarity.tx.sender !== mockClarity.state.admin) {
        return { err: 100 }; // Not admin
      }
      
      if (!mockClarity.state.verifiedEntities.has(entity)) {
        return { err: 102 }; // Entity not found
      }
      
      const entityData = mockClarity.state.verifiedEntities.get(entity);
      entityData.isActive = false;
      mockClarity.state.verifiedEntities.set(entity, entityData);
      
      return { ok: true };
    },
    
    isVerified: (entity: string) => {
      if (!mockClarity.state.verifiedEntities.has(entity)) {
        return false;
      }
      
      return mockClarity.state.verifiedEntities.get(entity).isActive;
    },
    
    getEntityDetails: (entity: string) => {
      if (!mockClarity.state.verifiedEntities.has(entity)) {
        return null;
      }
      
      return mockClarity.state.verifiedEntities.get(entity);
    },
    
    transferAdmin: (newAdmin: string) => {
      if (mockClarity.tx.sender !== mockClarity.state.admin) {
        return { err: 100 }; // Not admin
      }
      
      mockClarity.state.admin = newAdmin;
      return { ok: true };
    }
  }
};

describe('Entity Verification Contract', () => {
  beforeEach(() => {
    // Reset state before each test
    mockClarity.state.verifiedEntities = new Map();
    mockClarity.tx.sender = 'ST1PQHQKV0RJXZFY1DGX8MNSNYVE3VGZJSRTPGZGM'; // Reset to admin
    mockClarity.state.admin = 'ST1PQHQKV0RJXZFY1DGX8MNSNYVE3VGZJSRTPGZGM';
    mockClarity.blockHeight = 100;
  });
  
  it('should register a new entity', () => {
    const entity = 'ST2CY5V39NHDPWSXMW9QDT3HC3GD6Q6XX4CFRK9AG';
    const result = mockClarity.functions.registerEntity(entity, 'Acme Corp', 'Manufacturing');
    
    expect(result).toEqual({ ok: true });
    expect(mockClarity.state.verifiedEntities.has(entity)).toBe(true);
    expect(mockClarity.functions.isVerified(entity)).toBe(true);
  });
  
  it('should not allow non-admin to register entity', () => {
    mockClarity.tx.setSender('ST2CY5V39NHDPWSXMW9QDT3HC3GD6Q6XX4CFRK9AG');
    
    const entity = 'ST3AM1A56AK2C1XAFJ4115ZSV26EB49BVQ10MGCS0';
    const result = mockClarity.functions.registerEntity(entity, 'Acme Corp', 'Manufacturing');
    
    expect(result).toEqual({ err: 100 });
    expect(mockClarity.state.verifiedEntities.has(entity)).toBe(false);
  });
  
  it('should not register an entity twice', () => {
    const entity = 'ST2CY5V39NHDPWSXMW9QDT3HC3GD6Q6XX4CFRK9AG';
    mockClarity.functions.registerEntity(entity, 'Acme Corp', 'Manufacturing');
    
    const result = mockClarity.functions.registerEntity(entity, 'Acme Corp 2', 'Services');
    
    expect(result).toEqual({ err: 101 });
  });
  
  it('should deactivate an entity', () => {
    const entity = 'ST2CY5V39NHDPWSXMW9QDT3HC3GD6Q6XX4CFRK9AG';
    mockClarity.functions.registerEntity(entity, 'Acme Corp', 'Manufacturing');
    
    const result = mockClarity.functions.deactivateEntity(entity);
    
    expect(result).toEqual({ ok: true });
    expect(mockClarity.functions.isVerified(entity)).toBe(false);
  });
  
  it('should not deactivate a non-existent entity', () => {
    const entity = 'ST2CY5V39NHDPWSXMW9QDT3HC3GD6Q6XX4CFRK9AG';
    
    const result = mockClarity.functions.deactivateEntity(entity);
    
    expect(result).toEqual({ err: 102 });
  });
  
  it('should get entity details', () => {
    const entity = 'ST2CY5V39NHDPWSXMW9QDT3HC3GD6Q6XX4CFRK9AG';
    mockClarity.functions.registerEntity(entity, 'Acme Corp', 'Manufacturing');
    
    const details = mockClarity.functions.getEntityDetails(entity);
    
    expect(details).toEqual({
      name: 'Acme Corp',
      industry: 'Manufacturing',
      verificationDate: 100,
      isActive: true
    });
  });
  
  it('should transfer admin rights', () => {
    const newAdmin = 'ST2CY5V39NHDPWSXMW9QDT3HC3GD6Q6XX4CFRK9AG';
    
    const result = mockClarity.functions.transferAdmin(newAdmin);
    
    expect(result).toEqual({ ok: true });
    expect(mockClarity.state.admin).toBe(newAdmin);
    
    // Original admin should no longer have privileges
    mockClarity.tx.setSender('ST1PQHQKV0RJXZFY1DGX8MNSNYVE3VGZJSRTPGZGM');
    const entity = 'ST3AM1A56AK2C1XAFJ4115ZSV26EB49BVQ10MGCS0';
    const registerResult = mockClarity.functions.registerEntity(entity, 'Test Corp', 'Testing');
    
    expect(registerResult).toEqual({ err: 100 });
  });
});
