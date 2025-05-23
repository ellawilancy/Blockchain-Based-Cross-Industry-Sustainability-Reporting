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
    metrics: new Map(),
    metricCounter: 1
  },
  
  // Mock contract functions
  functions: {
    addMetric: (name: string, description: string, unit: string, category: string) => {
      if (mockClarity.tx.sender !== mockClarity.state.admin) {
        return { err: 100 }; // Not admin
      }
      
      const metricId = mockClarity.state.metricCounter;
      
      mockClarity.state.metrics.set(metricId, {
        name,
        description,
        unit,
        category,
        createdAt: mockClarity.blockHeight
      });
      
      mockClarity.state.metricCounter++;
      
      return { ok: metricId };
    },
    
    updateMetric: (metricId: number, name: string, description: string, unit: string, category: string) => {
      if (mockClarity.tx.sender !== mockClarity.state.admin) {
        return { err: 100 }; // Not admin
      }
      
      if (!mockClarity.state.metrics.has(metricId)) {
        return { err: 103 }; // Metric not found
      }
      
      const metric = mockClarity.state.metrics.get(metricId);
      
      mockClarity.state.metrics.set(metricId, {
        name,
        description,
        unit,
        category,
        createdAt: metric.createdAt
      });
      
      return { ok: true };
    },
    
    getMetric: (metricId: number) => {
      if (!mockClarity.state.metrics.has(metricId)) {
        return null;
      }
      
      return mockClarity.state.metrics.get(metricId);
    },
    
    getMetricsCount: () => {
      return mockClarity.state.metricCounter;
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

describe('Metric Definition Contract', () => {
  beforeEach(() => {
    // Reset state before each test
    mockClarity.state.metrics = new Map();
    mockClarity.state.metricCounter = 1;
    mockClarity.tx.sender = 'ST1PQHQKV0RJXZFY1DGX8MNSNYVE3VGZJSRTPGZGM'; // Reset to admin
    mockClarity.state.admin = 'ST1PQHQKV0RJXZFY1DGX8MNSNYVE3VGZJSRTPGZGM';
    mockClarity.blockHeight = 100;
  });
  
  it('should add a new metric', () => {
    const result = mockClarity.functions.addMetric(
        'Carbon Emissions',
        'Total carbon emissions in CO2 equivalent',
        'tonnes',
        'Environmental'
    );
    
    expect(result).toEqual({ ok: 1 });
    expect(mockClarity.state.metrics.has(1)).toBe(true);
    expect(mockClarity.functions.getMetric(1)).toEqual({
      name: 'Carbon Emissions',
      description: 'Total carbon emissions in CO2 equivalent',
      unit: 'tonnes',
      category: 'Environmental',
      createdAt: 100
    });
  });
  
  it('should not allow non-admin to add metric', () => {
    mockClarity.tx.setSender('ST2CY5V39NHDPWSXMW9QDT3HC3GD6Q6XX4CFRK9AG');
    
    const result = mockClarity.functions.addMetric(
        'Carbon Emissions',
        'Total carbon emissions in CO2 equivalent',
        'tonnes',
        'Environmental'
    );
    
    expect(result).toEqual({ err: 100 });
    expect(mockClarity.state.metrics.has(1)).toBe(false);
  });
  
  it('should update an existing metric', () => {
    mockClarity.functions.addMetric(
        'Carbon Emissions',
        'Total carbon emissions in CO2 equivalent',
        'tonnes',
        'Environmental'
    );
    
    const result = mockClarity.functions.updateMetric(
        1,
        'Carbon Emissions (Updated)',
        'Updated description',
        'kg',
        'Environmental Impact'
    );
    
    expect(result).toEqual({ ok: true });
    expect(mockClarity.functions.getMetric(1)).toEqual({
      name: 'Carbon Emissions (Updated)',
      description: 'Updated description',
      unit: 'kg',
      category: 'Environmental Impact',
      createdAt: 100
    });
  });
  
  it('should not update a non-existent metric', () => {
    const result = mockClarity.functions.updateMetric(
        999,
        'Carbon Emissions (Updated)',
        'Updated description',
        'kg',
        'Environmental Impact'
    );
    
    expect(result).toEqual({ err: 103 });
  });
  
  it('should get metrics count', () => {
    expect(mockClarity.functions.getMetricsCount()).toBe(1);
    
    mockClarity.functions.addMetric('Metric 1', 'Description 1', 'unit1', 'Category 1');
    expect(mockClarity.functions.getMetricsCount()).toBe(2);
    
    mockClarity.functions.addMetric('Metric 2', 'Description 2', 'unit2', 'Category 2');
    expect(mockClarity.functions.getMetricsCount()).toBe(3);
  });
  
  it('should transfer admin rights', () => {
    const newAdmin = 'ST2CY5V39NHDPWSXMW9QDT3HC3GD6Q6XX4CFRK9AG';
    
    const result = mockClarity.functions.transferAdmin(newAdmin);
    
    expect(result).toEqual({ ok: true });
    expect(mockClarity.state.admin).toBe(newAdmin);
    
    // Original admin should no longer have privileges
    mockClarity.tx.setSender('ST1PQHQKV0RJXZFY1DGX8MNSNYVE3VGZJSRTPGZGM');
    const addResult = mockClarity.functions.addMetric('Test Metric', 'Test Description', 'test', 'Test');
    
    expect(addResult).toEqual({ err: 100 });
  });
});
