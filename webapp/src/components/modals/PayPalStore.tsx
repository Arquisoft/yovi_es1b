import { PayPalButtons } from "@paypal/react-paypal-js";
import ReactDOM from 'react-dom';
import { useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { ModalDialog } from '../common/ModalDialog';

interface PayPalStoreProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (xpAmount: number) => void;
}

export const PayPalStore = ({ isOpen, onClose, onSuccess }: PayPalStoreProps) => {
  const { t } = useTranslation();
  const dialogRef = useRef<HTMLDialogElement>(null);
  if (!isOpen) return null;

  return ReactDOM.createPortal(
    <ModalDialog ref={dialogRef} className="modal-backdrop payment-overlay" ariaLabel={t('store.title')} onClose={onClose}>
      <div className="payment-card">
        <button type="button" className="payment-close" aria-label={t('common.close')} onClick={onClose}>&times;</button>

        <h2 className="payment-title">{t('store.title')}</h2>
        <p className="payment-subtitle">{t('store.subtitle')}</p>

        <div className="payment-item-detail">
          <span>{t('store.pack_label')}</span>
        </div>

        <div className="paypal-button-container">
            <PayPalButtons
              style={{ layout: "vertical", color: "gold", shape: "rect", label: "pay" }}
              createOrder={(_data, actions) => {
                if (!actions.order) {
                  alert(t('store.error'));
                  throw new Error('PayPal actions.order is not available');
                }

                return actions.order.create({
                  intent: "CAPTURE",
                  purchase_units: [
                    {
                      description: t('store.order_description'),
                      amount: {
                        currency_code: "EUR",
                        value: "1.00",
                      },
                    },
                  ],
                });
              }}
              onApprove={async (_data, actions) => {
                if (!actions.order) {
                  alert(t('store.error'));
                  return;
                }

                try {
                  const captureDetails = await actions.order.capture();
                  console.log("Pago exitoso:", captureDetails?.id ?? "sin id");
                  onSuccess(1000);
                  onClose();
                } catch (err) {
                  console.error("Error capturando el pago de PayPal:", err);
                  alert(t('store.error'));
                }
              }}
              onError={(err) => {
                console.error("Error en PayPal:", err);
                alert(t('store.error'));
              }}
            />
        </div>
        <p className="payment-footer">{t('store.footer')}</p>
      </div>
    </ModalDialog>,
    document.body
  );
};
