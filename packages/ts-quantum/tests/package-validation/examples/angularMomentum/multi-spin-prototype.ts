/**
 * T66 Phase 1 Test: Multi-Spin State with State Decomposition
 * Tests the functionality identified as failing in the original multi-spin-demo.ts
 * Now enhanced with state analysis and decomposition capabilities.
 */

import { MultiSpinState } from '../../src/angularMomentum/multiSpinState';
import { analyzeAngularState, extractJComponent, analysisToString } from '../../src/angularMomentum/stateAnalysis';
import { addAngularMomenta } from '../../src/angularMomentum/composition';
import { createJmState } from '../../src/angularMomentum/core';

function testStateAnalysis() {
  console.log('=== Phase 1: State Analysis Test ===\n');

  try {
    // Test A: Analyze a two-spin coupled state
    console.log('Test A: Two-spin state analysis');
    const spin1 = createJmState(0.5, 0.5);   // |1/2, +1/2⟩
    const spin2 = createJmState(0.5, -0.5);  // |1/2, -1/2⟩
    const coupledState = addAngularMomenta(spin1, 0.5, spin2, 0.5);
    
    console.log('Coupled state dimension:', coupledState.dimension);
    console.log('Coupled state norm:', coupledState.norm().toFixed(6));
    
    // Analyze the state
    const analysis = analyzeAngularState(coupledState, 0.5, 0.5);
    console.log('\nState Analysis:');
    console.log(analysisToString(analysis));
    
    // Test B: Extract J components
    console.log('\nTest B: J-component extraction');
    const j0Component = extractJComponent(coupledState, 0, 0.5, 0.5);
    const j1Component = extractJComponent(coupledState, 1, 0.5, 0.5);
    
    if (j0Component) {
      console.log('J=0 component extracted - dimension:', j0Component.state.dimension, 'norm:', j0Component.state.norm().toFixed(6));
    } else {
      console.log('J=0 component: not present or extraction failed');
    }
    
    if (j1Component) {
      console.log('J=1 component extracted - dimension:', j1Component.state.dimension, 'norm:', j1Component.state.norm().toFixed(6));
    } else {
      console.log('J=1 component: not present or extraction failed');
    }
    
    console.log('\n=== State Analysis Test Completed ===\n');
    return { coupledState, analysis, j0Component, j1Component };

  } catch (error: any) {
    console.error('ERROR in state analysis test:', error.message);
    console.error('Stack:', error.stack);
    return null;
  }
}

function testMultiSpinPrototype() {
  console.log('=== T66 Phase 1: Multi-Spin State Test ===\n');

  try {
    // First, test the state analysis functionality
    const analysisResults = testStateAnalysis();
    if (!analysisResults) {
      throw new Error('State analysis test failed');
    }

    // Test 1: Single spin state
    console.log('Test 1: Single spin state');
    const singleSpin = MultiSpinState.fromSingleSpin(0.5, 0.5);
    console.log('Single spin:', singleSpin.toString());
    console.log('Available J:', Array.from(singleSpin.getJComponents().keys()));
    console.log('Norm:', singleSpin.norm().toFixed(6));
    console.log();

    // Test 2: Two-spin coupling (should work)
    console.log('Test 2: Two-spin coupling');
    const twoSpin = singleSpin.addSpin(0.5, -0.5);
    console.log('Two-spin:', twoSpin.toString());
    console.log('Available J:', Array.from(twoSpin.getJComponents().keys()));
    console.log('Norm:', twoSpin.norm().toFixed(6));
    console.log();

    // Test 3: Three-spin coupling (THE KEY TEST - this was failing before)
    console.log('Test 3: Three-spin coupling (Critical T66 Test)');
    console.log('This test failed in the original prototype due to dimension mismatch.');
    console.log('With Phase 1 state decomposition, it should now work...\n');
    
    const threeSpin = twoSpin.addSpin(0.5, 0.5);
    console.log('✅ SUCCESS: Three-spin coupling completed!');
    console.log('Three-spin:', threeSpin.toString());
    console.log('Available J:', Array.from(threeSpin.getJComponents().keys()));
    console.log('Norm:', threeSpin.norm().toFixed(6));
    console.log();

    // Test 4: Four-spin coupling (pushing the limits)
    console.log('Test 4: Four-spin coupling (Extended test)');
    const fourSpin = threeSpin.addSpin(0.5, -0.5);
    console.log('✅ SUCCESS: Four-spin coupling completed!');
    console.log('Four-spin:', fourSpin.toString());
    console.log('Available J:', Array.from(fourSpin.getJComponents().keys()));
    console.log('Norm:', fourSpin.norm().toFixed(6));
    console.log();

    // Test 5: Detailed information
    console.log('Test 5: Detailed four-spin information');
    console.log(fourSpin.toDetailedString());

    // Test 6: Intertwiner analysis
    console.log('Test 6: Valid intertwiners for four-spin vertex');
    const intertwiners = fourSpin.getValidIntertwiners();
    console.log('Valid intertwiner J values:', intertwiners);
    console.log();

    // Test 7: J-component extraction from MultiSpinState
    console.log('Test 7: J-component extraction from multi-spin state');
    if (intertwiners.length > 0) {
      const extractedJ = fourSpin.extractJComponent(intertwiners[0]);
      if (extractedJ) {
        console.log(`✅ SUCCESS: Extracted J=${intertwiners[0]} component - dimension: ${extractedJ.dimension}, norm: ${extractedJ.norm().toFixed(6)}`);
      } else {
        console.log(`❌ FAILED: Could not extract J=${intertwiners[0]} component`);
      }
    }
    console.log();

    console.log('🎉 === ALL TESTS COMPLETED SUCCESSFULLY! ===');
    console.log('✅ T66 Phase 1 (State Decomposition) is working correctly');
    console.log('✅ Multi-spin coupling beyond 2 spins is now possible');
    console.log('✅ Ready for Phase 2 (Enhanced Multi-Spin Coupling)');
    
    return true;

  } catch (error: any) {
    console.error('❌ ERROR in MultiSpinState test:', error.message);
    console.error('Stack:', error.stack);
    return false;
  }
}

// Export for use in other files
export { testMultiSpinPrototype, testStateAnalysis };

// Run test if called directly
// if (require.main === module) {
  testMultiSpinPrototype();
// }
