/**
 * Premium DEA-branded email template
 * Creates a professional email layout with gradient background, centered card, and DEA branding
 */

interface EmailTemplateOptions {
  title: string;
  greeting?: string;
  content: string;
  buttonText?: string;
  buttonUrl?: string;
  additionalSections?: string;
}

export function buildEmailTemplate({
  title,
  greeting,
  content,
  buttonText,
  buttonUrl,
  additionalSections = '',
}: EmailTemplateOptions): string {
  // DEA logo - using relative path that will work when email is sent from the application
  const logoUrl = `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/dea-logo.png`;

  return `
    <!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <link rel="preconnect" href="https://fonts.googleapis.com">
      <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
      <link href="https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;700&display=swap" rel="stylesheet">
    </head>
    <body style="margin: 0; padding: 0; font-family: 'DM Sans', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background: linear-gradient(135deg, #4fd1c5 0%, #2b6cb0 100%); min-height: 100vh;">
      <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="background: linear-gradient(135deg, #4fd1c5 0%, #2b6cb0 100%); min-height: 100vh; padding: 40px 20px;">
        <tr>
          <td align="center">
            <!-- Main Card Container -->
            <table role="presentation" cellspacing="0" cellpadding="0" border="0" style="max-width: 600px; width: 100%; background: #ffffff; border-radius: 16px; box-shadow: 0 10px 40px rgba(0, 0, 0, 0.15); overflow: hidden;">
              <!-- Logo Section -->
              <tr>
                <td align="center" style="padding: 40px 40px 20px 40px;">
                  <img src="${logoUrl}" alt="Digital Euro Association" style="max-width: 180px; height: auto; display: block;" />
                </td>
              </tr>

              <!-- Title Section -->
              <tr>
                <td style="padding: 0 40px 20px 40px;">
                  <h1 style="margin: 0; font-size: 24px; font-weight: 700; color: #1a202c; text-align: center; line-height: 1.3;">
                    ${title}
                  </h1>
                </td>
              </tr>

              ${greeting ? `
              <!-- Greeting Section -->
              <tr>
                <td style="padding: 0 40px 16px 40px;">
                  <p style="margin: 0; font-size: 16px; font-weight: 400; color: #4a5568; line-height: 1.6;">
                    ${greeting}
                  </p>
                </td>
              </tr>
              ` : ''}

              <!-- Main Content Section -->
              <tr>
                <td style="padding: 0 40px 24px 40px;">
                  <div style="font-size: 15px; color: #2d3748; line-height: 1.7;">
                    ${content}
                  </div>
                </td>
              </tr>

              ${additionalSections}

              ${buttonText && buttonUrl ? `
              <!-- Call to Action Button -->
              <tr>
                <td align="center" style="padding: 0 40px 32px 40px;">
                  <table role="presentation" cellspacing="0" cellpadding="0" border="0">
                    <tr>
                      <td style="border-radius: 8px; background: linear-gradient(135deg, #38bdf8 0%, #3b82f6 100%);">
                        <a href="${buttonUrl}" target="_blank" style="display: inline-block; padding: 14px 32px; font-family: 'DM Sans', sans-serif; font-size: 16px; font-weight: 600; color: #ffffff; text-decoration: none; border-radius: 8px; transition: transform 0.2s;">
                          ${buttonText}
                        </a>
                      </td>
                    </tr>
                  </table>
                </td>
              </tr>
              ` : ''}

              <!-- Footer Section -->
              <tr>
                <td style="padding: 24px 40px 40px 40px; border-top: 1px solid #e2e8f0;">
                  <p style="margin: 0; font-size: 13px; color: #718096; line-height: 1.6; text-align: center;">
                    This is an automated message from the Digital Euro Association Travel Authorization System. Please do not reply.
                  </p>
                </td>
              </tr>
            </table>
          </td>
        </tr>
      </table>
    </body>
    </html>
  `;
}

/**
 * Helper function to create a styled info box for additional content
 * Useful for comments, reasons, or highlighted information
 */
export function createInfoBox(content: string, type: 'info' | 'warning' | 'success' | 'error' = 'info'): string {
  const colors = {
    info: { bg: '#eff6ff', border: '#3b82f6', text: '#1e40af' },
    warning: { bg: '#fffbeb', border: '#f59e0b', text: '#92400e' },
    success: { bg: '#f0fdf4', border: '#10b981', text: '#065f46' },
    error: { bg: '#fef2f2', border: '#ef4444', text: '#991b1b' },
  };

  const color = colors[type];

  return `
    <tr>
      <td style="padding: 0 40px 24px 40px;">
        <div style="background: ${color.bg}; border-left: 4px solid ${color.border}; border-radius: 8px; padding: 16px 20px;">
          <p style="margin: 0; font-size: 14px; color: ${color.text}; line-height: 1.6;">
            ${content}
          </p>
        </div>
      </td>
    </tr>
  `;
}

/**
 * Helper function to create a details table for structured information
 * Useful for displaying travel details, expense breakdowns, etc.
 */
export function createDetailsTable(items: Array<{ label: string; value: string }>): string {
  const rows = items
    .map(
      (item) => `
    <tr>
      <td style="padding: 10px 16px; font-size: 14px; font-weight: 600; color: #4a5568; border-bottom: 1px solid #e2e8f0;">
        ${item.label}
      </td>
      <td style="padding: 10px 16px; font-size: 14px; color: #2d3748; border-bottom: 1px solid #e2e8f0; text-align: right;">
        ${item.value}
      </td>
    </tr>
  `
    )
    .join('');

  return `
    <tr>
      <td style="padding: 0 40px 24px 40px;">
        <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="background: #f7fafc; border-radius: 8px; overflow: hidden;">
          ${rows}
        </table>
      </td>
    </tr>
  `;
}
