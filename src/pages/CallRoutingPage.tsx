import React from 'react';
import { Phone, Bot, Voicemail, ArrowRight } from 'lucide-react';

const CallRoutingPage = () => {
  return (
    <div className="py-6">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
       <h1 className="text-2xl font-semibold text-ink mb-8">Call Routing</h1>

         <div className="bg-paper shadow rounded-card p-6">
           <div className="space-y-6">
             {/* Call App Route */}
             <div className="border border-border rounded-card p-4">
               <div className="flex items-center justify-between">
                 <div className="flex items-center">
                   <div className="bg-signal/10 p-2 rounded-card">
                     <Phone className="w-6 h-6 text-signal" />
                   </div>
                   <div className="ml-4">
                     <h3 className="text-lg font-medium text-ink">Call App</h3>
                     <p className="text-sm text-muted">Route calls to your Click2Call app</p>
                   </div>
                 </div>
                 <label className="flex items-center">
                   <input type="radio" name="route" className="text-signal" />
                   <ArrowRight className="w-5 h-5 ml-2 text-muted" />
                 </label>
               </div>
             </div>

             {/* AI Bot Route */}
             <div className="border border-border rounded-card p-4">
               <div className="flex items-center justify-between">
                 <div className="flex items-center">
                   <div className="bg-signal/10 p-2 rounded-card">
                     <Bot className="w-6 h-6 text-signal" />
                   </div>
                   <div className="ml-4">
                     <h3 className="text-lg font-medium text-ink">AI Bot</h3>
                     <p className="text-sm text-muted">Route calls to an AI assistant</p>
                   </div>
                 </div>
                 <label className="flex items-center">
                   <input type="radio" name="route" className="text-signal" />
                   <ArrowRight className="w-5 h-5 ml-2 text-muted" />
                 </label>
               </div>
             </div>

             {/* Voicemail Route */}
             <div className="border border-border rounded-card p-4">
               <div className="flex items-center justify-between">
                 <div className="flex items-center">
                   <div className="bg-success/10 p-2 rounded-card">
                     <Voicemail className="w-6 h-6 text-success" />
                   </div>
                   <div className="ml-4">
                     <h3 className="text-lg font-medium text-ink">Voicemail</h3>
                     <p className="text-sm text-muted">Send calls to voicemail</p>
                   </div>
                 </div>
                 <label className="flex items-center">
                   <input type="radio" name="route" className="text-signal" />
                   <ArrowRight className="w-5 h-5 ml-2 text-muted" />
                 </label>
               </div>
             </div>
           </div>

           {/* Settings */}
           <div className="mt-8">
             <h3 className="text-lg font-medium text-ink mb-4">Route Settings</h3>
             <div className="space-y-4">
               <div>
                 <label className="block text-sm font-medium text-ink">Business Hours</label>
                 <div className="mt-1 grid grid-cols-2 gap-4">
                   <input
                     type="time"
                     className="block w-full rounded-control border-border shadow-sm focus:border-signal focus:ring-signal"
                   />
                   <input
                     type="time"
                     className="block w-full rounded-control border-border shadow-sm focus:border-signal focus:ring-signal"
                   />
                 </div>
               </div>
               <div>
                 <label className="block text-sm font-medium text-ink">Fallback Route</label>
                 <select className="mt-1 block w-full rounded-control border-border shadow-sm focus:border-signal focus:ring-signal">
                   <option>Voicemail</option>
                   <option>AI Bot</option>
                 </select>
               </div>
             </div>
           </div>

           <div className="mt-8 flex justify-end">
             <button className="bg-signal text-paper px-4 py-2 rounded-card hover:bg-signal/90">
               Save Changes
             </button>
           </div>
         </div>
      </div>
    </div>
  );
};

export default CallRoutingPage;