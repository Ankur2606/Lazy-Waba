import { NextResponse } from 'next/server';
import open from 'open';

export async function POST() {
  try {
    // Use the open package to launch WhatsApp
    await open('whatsapp://', { wait: false });
    
    // Alternatively, you could use the direct path as a fallback
    // await open('C:\\Users\\%USERNAME%\\AppData\\Local\\WhatsApp\\WhatsApp.exe', { wait: false });
    
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error launching WhatsApp:', error);
    return NextResponse.json({ 
      success: false, 
      error: error instanceof Error ? error.message : 'Unknown error' 
    }, { status: 500 });
  }
}