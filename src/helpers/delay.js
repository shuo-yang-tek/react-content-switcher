export default function delay(timeout, useReject = false) {
   return new Promise((resolve, reject) => 
      setTimeout(
         useReject ? reject : resolve,
         timeout
      ));
}
