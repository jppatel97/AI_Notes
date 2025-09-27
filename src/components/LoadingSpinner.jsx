import React from 'react';

const LoadingSpinner = () => {
  return (
    <div className="loading-indicator">
      <div className="spinner"></div>
      <span>Processing...</span>
    </div>
  );
};

export default LoadingSpinner;
