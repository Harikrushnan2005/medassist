import os
import smtplib
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
from dotenv import load_dotenv

# Load env variables
load_dotenv()

SMTP_SERVER = os.getenv("SMTP_SERVER", "").strip()
SMTP_PORT = os.getenv("SMTP_PORT", "587").strip()
SMTP_USER = os.getenv("SMTP_USER", "").strip()
SMTP_PASSWORD = os.getenv("SMTP_PASSWORD", "").strip()
EMAIL_FROM = os.getenv("EMAIL_FROM", "").strip()

def send_confirmation_email(recipient_email: str, appointment_details: dict, msg_type: str = "scheduled"):
    """
    Sends a real email using SMTP if credentials are provided.
    msg_type: "scheduled", "cancelled", "rescheduled"
    """
    subject_map = {
        "scheduled": "MedSchedule: Appointment Confirmation",
        "cancelled": "MedSchedule: Appointment Cancellation",
        "rescheduled": "MedSchedule: Appointment Rescheduled"
    }
    title_map = {
        "scheduled": "Appointment Confirmed!",
        "cancelled": "Appointment Cancelled",
        "rescheduled": "Appointment Rescheduled"
    }
    
    subject = subject_map.get(msg_type, "MedSchedule Appointment Update")
    title = title_map.get(msg_type, "Appointment Update")
    display_name = "MedSchedule AI Assistant"
    
    action_text = "has been successfully scheduled"
    if msg_type == "cancelled":
        action_text = "has been cancelled"
    elif msg_type == "rescheduled":
        action_text = "has been rescheduled to a new time"

    # Plain text version
    message_body = (
        f"Dear {appointment_details.get('patient_name', 'Patient')},\n\n"
        f"Your appointment {action_text}.\n"
        f"Details:\n"
        f"- Date: {appointment_details['date']}\n"
        f"- Time: {appointment_details['time']}\n"
        f"- Provider: {appointment_details['provider']}\n"
        f"- Visit Type: {appointment_details['visit_type']}\n\n"
        f"Thank you for choosing MedSchedule!"
    )

    # HTML version
    html_body = f"""
    <html>
    <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
        <div style="max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #ddd; border-radius: 10px;">
            <h2 style="color: {'#f59e0b' if msg_type != 'cancelled' else '#ef4444'};">{title}</h2>
            <p>Dear <strong>{appointment_details.get('patient_name', 'Patient')}</strong>,</p>
            <p>Your appointment {action_text}. Here are the latest details:</p>
            <table style="width: 100%; border-collapse: collapse;">
                <tr><td style="padding: 10px 0; border-bottom: 1px solid #eee;"><strong>Date:</strong></td><td style="padding: 10px 0; border-bottom: 1px solid #eee;">{appointment_details['date']}</td></tr>
                <tr><td style="padding: 10px 0; border-bottom: 1px solid #eee;"><strong>Time:</strong></td><td style="padding: 10px 0; border-bottom: 1px solid #eee;">{appointment_details['time']}</td></tr>
                <tr><td style="padding: 10px 0; border-bottom: 1px solid #eee;"><strong>Provider:</strong></td><td style="padding: 10px 0; border-bottom: 1px solid #eee;">{appointment_details['provider']}</td></tr>
                <tr><td style="padding: 10px 0; border-bottom: 1px solid #eee;"><strong>Visit Type:</strong></td><td style="padding: 10px 0; border-bottom: 1px solid #eee;">{appointment_details['visit_type']}</td></tr>
            </table>
            <p style="margin-top: 20px;">{"We look forward to seeing you!" if msg_type != 'cancelled' else "We hope to see you again soon."}</p>
            <hr style="border: 0; border-top: 1px solid #eee; margin: 20px 0;">
            <p style="font-size: 12px; color: #888; text-align: center;">This is an automated message from MedSchedule Healthcare.<br>Please do not reply directly to this email.</p>
        </div>
    </body>
    </html>
    """

    if all([SMTP_SERVER, SMTP_PORT, SMTP_USER, SMTP_PASSWORD, EMAIL_FROM]):
        try:
            msg = MIMEMultipart('alternative')
            msg['From'] = f"{display_name} <{EMAIL_FROM}>"
            msg['To'] = recipient_email
            msg['Subject'] = subject
            
            msg.attach(MIMEText(message_body, 'plain'))
            msg.attach(MIMEText(html_body, 'html'))

            server = smtplib.SMTP(str(SMTP_SERVER), int(SMTP_PORT or 587))
            server.starttls()
            server.login(str(SMTP_USER), str(SMTP_PASSWORD).replace(" ", ""))
            server.send_message(msg)
            server.quit()
            
            print(f"✅ SMTP Email sent successfully to {recipient_email}")
            return True
        except Exception as e:
            error_msg = f"Error sending real email through SMTP: {e}"
            print(error_msg)
            
            # Log to file for production debugging
            with open("email_errors.log", "a") as f:
                f.write(f"{error_msg}\n")
                
            # Fallback to simulation
            print("\n--- EMAIL GATEWAY SIMULATION (FALLBACK) ---")
            print(f"TO: {recipient_email}")
            print(f"SUBJECT: {subject}")
            print(f"MESSAGE: {message_body}")
            print("--------------------------------------------\n")
            return False
    else:
        # Simulations mode
        print("\n--- EMAIL GATEWAY SIMULATION (NO CONFIG) ---")
        print(f"TO: {recipient_email}")
        print(f"SUBJECT: {subject}")
        print(f"MESSAGE: {message_body}")
        print("--------------------------------------------\n")
        print("TIP: Add SMTP_SERVER, SMTP_PORT, SMTP_USER, SMTP_PASSWORD, and EMAIL_FROM to .env for real emails.")
        return True
