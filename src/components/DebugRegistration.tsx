import React from 'react';

interface DebugRegistrationProps {
  sessionSelections: any[];
  productsData: any[];
  sessionsData: any[];
}

export function DebugRegistration({ sessionSelections, productsData, sessionsData }: DebugRegistrationProps) {
  if (process.env.NODE_ENV !== 'development') {
    return null;
  }

  return (
    <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mt-4">
      <h3 className="text-sm font-medium text-yellow-800 mb-2">🔍 Debug: Registration Status</h3>
      <div className="text-xs text-yellow-700 space-y-2">
        <div className="mb-4 p-3 bg-white rounded border">
          <div className="font-medium text-yellow-800 mb-2">📊 Data Summary</div>
          <div className="grid grid-cols-3 gap-4 text-xs">
            <div>
              <div className="font-medium">Sessions Data:</div>
              <div>Count: {sessionsData?.length || 0}</div>
              <div>Loaded: {sessionsData ? '✅' : '❌'}</div>
            </div>
            <div>
              <div className="font-medium">Products Data:</div>
              <div>Count: {productsData?.length || 0}</div>
              <div>Loaded: {productsData ? '✅' : '❌'}</div>
              <div>Food: {productsData?.filter(p => p.productType === 'Food').length || 0}</div>
              <div>Entry: {productsData?.filter(p => p.productType === 'Entry').length || 0}</div>
            </div>
            <div>
              <div className="font-medium">Form State:</div>
              <div>Sessions: {sessionSelections?.length || 0}</div>
              <div>Selected: {sessionSelections?.filter(s => s.selected).length || 0}</div>
            </div>
          </div>
        </div>
        
        {sessionSelections?.map((session, idx) => {
          const sessionData = sessionsData?.find(s => s.id === session.sessionId);
          const allProducts = session.productSelections || [];
          const foodProducts = allProducts.filter(ps => {
            const product = productsData?.find(p => p.id === ps.productId);
            return product?.productType === 'Food';
          });
          const entryProducts = allProducts.filter(ps => {
            const product = productsData?.find(p => p.id === ps.productId);
            return product?.productType === 'Entry';
          });
          
          return (
            <div key={idx} className="border-l-4 border-yellow-400 pl-3 mb-4">
              <div className="font-medium text-yellow-900 mb-1">
                Session {idx + 1}: {sessionData?.sessionName || `Unknown (ID: ${session.sessionId})`}
              </div>
              
              <div className="ml-2 space-y-2">
                <div className="flex items-center space-x-4">
                  <span>Selected: {session.selected ? '✅' : '❌'}</span>
                  <span>Available Spots: {sessionData?.availableSpots || 'Unknown'}</span>
                  <span>Full: {sessionData?.isFull ? '🚫' : '✅'}</span>
                </div>
                
                <div className="grid grid-cols-2 gap-4">
                  <div className="bg-green-50 p-2 rounded border">
                    <div className="font-medium text-green-800">🍽️ Food Products ({foodProducts.length})</div>
                    {foodProducts.length === 0 ? (
                      <div className="text-red-600 text-xs">No food products found!</div>
                    ) : (
                      foodProducts.map((fp, fpIdx) => {
                        const product = productsData?.find(p => p.id === fp.productId);
                        const productType = product?.productTypes?.find(pt => pt.id === fp.productTypeId);
                        return (
                          <div key={fpIdx} className="ml-2 text-xs mt-1 p-1 bg-white rounded">
                            <div className="font-medium">
                              {product?.productName || `Product ID ${fp.productId}`}
                            </div>
                            <div className="text-gray-600">
                              Type: {productType?.productSize || `Type ID ${fp.productTypeId}`} 
                              ({productType?.productChoice || 'Unknown'})
                            </div>
                            <div className="text-gray-600">
                              Subtype: {productType?.productSubtype || 'Unknown'}
                            </div>
                            <div className={`font-medium ${fp.quantity > 0 ? 'text-green-600' : 'text-gray-400'}`}>
                              Qty: {fp.quantity} @ ${productType?.productPrice || 0}
                            </div>
                            {!product && (
                              <div className="text-red-600 text-xs">⚠️ Product not found in data!</div>
                            )}
                            {!productType && product && (
                              <div className="text-red-600 text-xs">⚠️ Product type not found!</div>
                            )}
                          </div>
                        );
                      })
                    )}
                  </div>
                  
                  <div className="bg-blue-50 p-2 rounded border">
                    <div className="font-medium text-blue-800">🎫 Entry Products ({entryProducts.length})</div>
                    {entryProducts.map((ep, epIdx) => {
                      const product = productsData?.find(p => p.id === ep.productId);
                      const productType = product?.productTypes?.find(pt => pt.id === ep.productTypeId);
                      return (
                        <div key={epIdx} className="ml-2 text-xs mt-1 p-1 bg-white rounded">
                          <div className="font-medium">
                            {product?.productName || `Product ID ${ep.productId}`}
                          </div>
                          <div className="text-gray-600">
                            Type: {productType?.productSize || `Type ID ${ep.productTypeId}`}
                          </div>
                          <div className={`font-medium ${ep.quantity > 0 ? 'text-blue-600' : 'text-gray-400'}`}>
                            Qty: {ep.quantity} @ ${productType?.productPrice || 0}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
                
                {/* Show session product mappings */}
                <div className="bg-gray-50 p-2 rounded border">
                  <div className="font-medium text-gray-800">🔗 Available Products in Session</div>
                  {sessionData?.productSessionMaps?.length === 0 ? (
                    <div className="text-red-600 text-xs">No products mapped to this session!</div>
                  ) : (
                    <div className="text-xs mt-1">
                      {sessionData?.productSessionMaps?.map((psm: any, psmIdx: number) => (
                        <div key={psmIdx} className="ml-2 p-1 bg-white rounded mb-1">
                          <div className="font-medium">
                            {psm.product.productName} ({psm.product.productType})
                          </div>
                          <div className="text-gray-600">
                            Types: {psm.product.productTypes?.length || 0}
                            {psm.product.productTypes?.map((pt: any) => (
                              <span key={pt.id} className="ml-1 text-xs bg-gray-200 px-1 rounded">
                                {pt.productSize}
                              </span>
                            ))}
                          </div>
                        </div>
                      )) || <div className="text-red-600">No product session maps found!</div>}
                    </div>
                  )}
                </div>
                
                {/* Show potential issues */}
                <div className="bg-red-50 p-2 rounded border">
                  <div className="font-medium text-red-800">⚠️ Potential Issues</div>
                  <div className="text-xs mt-1 space-y-1">
                    {!sessionData && (
                      <div className="text-red-600">• Session data not found for ID {session.sessionId}</div>
                    )}
                    {allProducts.length === 0 && (
                      <div className="text-red-600">• No product selections in form state</div>
                    )}
                    {sessionData?.productSessionMaps?.length === 0 && (
                      <div className="text-red-600">• No products mapped to this session</div>
                    )}
                    {foodProducts.some(fp => {
                      const product = productsData?.find(p => p.id === fp.productId);
                      return !product;
                    }) && (
                      <div className="text-red-600">• Some food products not found in products data</div>
                    )}
                    {foodProducts.some(fp => {
                      const product = productsData?.find(p => p.id === fp.productId);
                      const productType = product?.productTypes?.find(pt => pt.id === fp.productTypeId);
                      return product && !productType;
                    }) && (
                      <div className="text-red-600">• Some food product types not found</div>
                    )}
                    {session.selected && foodProducts.length === 0 && sessionData?.productSessionMaps?.some((psm: any) => psm.product.productType === 'Food') && (
                      <div className="text-red-600">• Session has food products but none in form state</div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          );
        })}
        
        {/* Overall food selection summary */}
        <div className="mt-4 p-3 bg-white rounded border">
          <div className="font-medium text-yellow-800 mb-2">🍽️ Food Selection Summary</div>
          <div className="text-xs space-y-1">
            {['Adult', 'Children', 'Elder'].map(personType => {
              const selectedFoodByType = sessionSelections?.flatMap(session => 
                session.selected ? session.productSelections?.filter(ps => {
                  const product = productsData?.find(p => p.id === ps.productId);
                  const productTypeData = product?.productTypes?.find(pt => pt.id === ps.productTypeId);
                  return product?.productType === 'Food' && 
                         productTypeData?.productSize === personType && 
                         ps.quantity > 0;
                }) || [] : []
              ) || [];
              
              return (
                <div key={personType} className="flex justify-between">
                  <span>{personType}:</span>
                  <span className={selectedFoodByType.length > 0 ? 'text-green-600' : 'text-gray-400'}>
                    {selectedFoodByType.length} selections
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
