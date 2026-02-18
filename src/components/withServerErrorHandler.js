import React, { useState } from 'react';
import { Modal } from 'react-native';
import ServerErrorScreen from '../screens/ServerErrorScreen';
import { isServerError } from '../utils/errorHandler';

/**
 * HOC - Ekranlara sunucu hatası yönetimi ekler
 * @param {Component} WrappedComponent - Sarmalanacak komponent
 * @returns {Component} - Hata yönetimi eklenmiş komponent
 */
const withServerErrorHandler = (WrappedComponent) => {
  return (props) => {
    const [showServerError, setShowServerError] = useState(false);
    const [retryCallback, setRetryCallback] = useState(null);

    /**
     * Sunucu hatası göster
     * @param {Function} onRetry - Tekrar dene callback'i
     */
    const handleServerError = (onRetry = null) => {
      setShowServerError(true);
      if (onRetry) {
        setRetryCallback(() => onRetry);
      }
    };

    /**
     * Hata ekranını kapat
     */
    const handleClose = () => {
      setShowServerError(false);
      setRetryCallback(null);
    };

    /**
     * Tekrar dene
     */
    const handleRetry = () => {
      setShowServerError(false);
      if (retryCallback) {
        retryCallback();
      }
      setRetryCallback(null);
    };

    /**
     * Destek ile iletişime geç
     */
    const handleContactSupport = () => {
      setShowServerError(false);
      // Destek ekranına yönlendir veya email aç
      if (props.navigation) {
        props.navigation.navigate('LiveChat');
      }
    };

    return (
      <>
        <WrappedComponent
          {...props}
          onServerError={handleServerError}
          checkServerError={(error) => isServerError(error)}
        />
        
        <Modal
          visible={showServerError}
          animationType="slide"
          presentationStyle="fullScreen"
        >
          <ServerErrorScreen
            onRetry={handleRetry}
            onClose={() => {}}
            onContactSupport={handleContactSupport}
          />
        </Modal>
      </>
    );
  };
};

export default withServerErrorHandler;

      setRetryCallback(null);

    };



    /**

     * Destek ile iletişime geç

     */

    const handleContactSupport = () => {

      setShowServerError(false);

      // Destek ekranına yönlendir veya email aç

      if (props.navigation) {

        props.navigation.navigate('LiveChat');

      }

    };



    return (

      <>

        <WrappedComponent

          {...props}

          onServerError={handleServerError}

          checkServerError={(error) => isServerError(error)}

        />

        

        <Modal

          visible={showServerError}

          animationType="slide"

          presentationStyle="fullScreen"

          onRequestClose={handleClose}

        >

          <ServerErrorScreen

            onRetry={handleRetry}

            onClose={handleClose}

            onContactSupport={handleContactSupport}

          />

        </Modal>

      </>

    );

  };

};



export default withServerErrorHandler;


