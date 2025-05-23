"""
Topology Service for SKB Visualization Application.
Handles topological compatibility computations between Sub-SKBs.
"""

import logging
from typing import Dict, Any, Optional

logger = logging.getLogger(__name__)


class TopologyService:
    """Service for topological computations."""
    
    def compute_compatibility(self, data: Dict[str, Any]) -> Dict[str, Any]:
        """
        Compute topological compatibility between two Sub-SKBs from API request.
        
        Args:
            data: Request data containing skb1 and skb2 parameters
            
        Returns:
            Dict containing compatibility analysis
        """
        skb1 = data.get('skb1', {})
        skb2 = data.get('skb2', {})
        
        return self.compute_compatibility_internal(skb1, skb2)
    
    def compute_compatibility_internal(
        self, 
        skb1: Dict[str, Any], 
        skb2: Dict[str, Any]
    ) -> Dict[str, Any]:
        """
        Internal method to compute topological compatibility between two Sub-SKBs.
        
        Args:
            skb1: First Sub-SKB parameters
            skb2: Second Sub-SKB parameters
            
        Returns:
            Dict containing detailed compatibility analysis
        """
        try:
            # Extract and validate parameters
            params1 = self._extract_skb_parameters(skb1)
            params2 = self._extract_skb_parameters(skb2)
            
            # Compute compatibility components
            w1_compatible = self._compute_stiefel_whitney_compatibility(params1, params2)
            twist_compatible = self._compute_twist_compatibility(params1, params2)
            ctc_stable = self._compute_ctc_stability(params1, params2)
            ks_compatible = self._compute_kirby_siebenmann_compatibility(params1, params2)
            q_compatible = self._compute_intersection_form_compatibility(params1, params2)
            
            # Overall compatibility
            compatible = all([
                w1_compatible, twist_compatible, ks_compatible, 
                q_compatible, ctc_stable
            ])
            
            # Detailed compatibility report
            compatibility_details = {
                "w1_compatible": w1_compatible,
                "twist_compatible": twist_compatible,
                "ks_compatible": ks_compatible,
                "q_compatible": q_compatible,
                "ctc_stable": ctc_stable,
                "compatible": compatible
            }
            
            logger.debug(f"Computed compatibility: {compatible}")
            return compatibility_details
            
        except (ValueError, TypeError) as e:
            logger.error(f"Error in topology computation: {e}")
            return {"error": str(e), "compatible": False}
    
    def _extract_skb_parameters(self, skb: Dict[str, Any]) -> Dict[str, float]:
        """Extract and validate SKB parameters."""
        return {
            'tx': float(skb.get('tx', 0)),
            'ty': float(skb.get('ty', 0)),
            'tz': float(skb.get('tz', 0)),
            'tt': float(skb.get('tt', 0)),
            'orientable': int(skb.get('orientable', 1)),
            'genus': int(skb.get('genus', 0))
        }
    
    def _compute_stiefel_whitney_compatibility(
        self, 
        params1: Dict[str, float], 
        params2: Dict[str, float]
    ) -> bool:
        """Compute Stiefel-Whitney class compatibility."""
        return params1['orientable'] == params2['orientable']
    
    def _compute_twist_compatibility(
        self, 
        params1: Dict[str, float], 
        params2: Dict[str, float]
    ) -> bool:
        """Compute twist parameter compatibility."""
        twist_sum = (
            abs(params1['tx'] + params2['tx']) + 
            abs(params1['ty'] + params2['ty']) + 
            abs(params1['tz'] + params2['tz'])
        )
        return twist_sum < 1.0
    
    def _compute_ctc_stability(
        self, 
        params1: Dict[str, float], 
        params2: Dict[str, float]
    ) -> bool:
        """Compute Closed Timelike Curve stability."""
        time_twist_sum = abs(params1['tt'] + params2['tt'])
        return time_twist_sum < 0.5
    
    def _compute_kirby_siebenmann_compatibility(
        self, 
        params1: Dict[str, float], 
        params2: Dict[str, float]
    ) -> bool:
        """Compute Kirby-Siebenmann invariant compatibility."""
        ks1 = (params1['tx'] * params1['ty'] * params1['tz']) % 2
        ks2 = (params2['tx'] * params2['ty'] * params2['tz']) % 2
        return ks1 == ks2
    
    def _compute_intersection_form_compatibility(
        self, 
        params1: Dict[str, float], 
        params2: Dict[str, float]
    ) -> bool:
        """Compute intersection form type compatibility."""
        q_form_1 = "Positive Definite" if params1['tx'] * params1['ty'] > 0 else "Indefinite"
        q_form_2 = "Positive Definite" if params2['tx'] * params2['ty'] > 0 else "Indefinite"
        return q_form_1 == q_form_2 