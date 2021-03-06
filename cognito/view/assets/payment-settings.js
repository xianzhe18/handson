 C o g n i t o . r e a d y ( " p a y m e n t - s e t t i n g s " ,   [ " C o g n i t o . P a y m e n t " ,   " E x o W e b . c o n t e x t " ] ,   f u n c t i o n   ( $ )   {  
  
         / / # r e g i o n   S e t t i n g s   W i z a r d  
         f u n c t i o n   S e t t i n g s W i z a r d ( )   {  
                 O b j e c t . d e f i n e P r o p e r t y ( t h i s ,   " s t e p s " ,   {   v a l u e :   { }   } ) ;  
                 O b j e c t . d e f i n e P r o p e r t y ( t h i s ,   " c u r r e n t S t e p " ,   {   v a l u e :   { } ,   w r i t a b l e :   t r u e   } ) ;  
         }  
  
         S e t t i n g s W i z a r d . m i x i n ( {  
                 r e g i s t e r :   f u n c t i o n   S e t t i n g s W i z a r d $ r e g i s t e r S t e p ( s t e p )   {  
                         i f   ( ! s t e p   | |   ! ( s t e p   i n s t a n c e o f   C o g n i t o . P a y m e n t . S e t t i n g s W i z a r d S t e p ) )   {  
                                 t h r o w   n e w   E r r o r ( " O n l y   p a y m e n t   s e t t i n g s   s t e p s   c a n   b e   r e g i s t e r e d " ) ;  
                         }  
  
                         i f   ( ! s t e p . n a m e )   {  
                                 t h r o w   n e w   E r r o r ( " S t e p s   m u s t   h a v e   a   n a m e " ) ;  
                         }  
  
                         t h i s . s t e p s [ s t e p . n a m e ]   =   s t e p ;  
                 } ,  
                 n a v i g a t e T o :   f u n c t i o n   S e t t i n g s W i z a r d $ n a v i g a t e T o S t e p ( s t e p N a m e ,   a r g s )   {  
                         i f   ( ! s t e p N a m e )   {  
                                 t h r o w   n e w   E r r o r ( " A   s t e p   n a m e   m u s t   b e   s p e c i f i e d . " ) ;  
                         }  
  
                         v a r   s t e p   =   t h i s . s t e p s [ s t e p N a m e ] ;  
  
                         i f   ( ! s t e p )   {  
                                 t h r o w   n e w   E r r o r ( s t e p N a m e   +   "   i s   n o t   a   r e g i s t e r e d   w i z a r d   s t e p . " ) ;  
                         }  
  
                         t h i s . c u r r e n t S t e p   =   s t e p ;  
                         $ ( " . c - p a y m e n t - s e t t i n g s - e r r o r " ) . h i d e ( ) ;  
                         p a y m e n t S e t t i n g s D i a l o g . _ d i a l o g . f i n d ( " . c - m o d a l - b u t t o n - e x e c u t i n g " ) . r e m o v e C l a s s ( " c - m o d a l - b u t t o n - e x e c u t i n g " ) ;  
                         s t e p . n a v i g a t e ( a r g s ) ;  
                 }  
         } ) ;  
  
         C o g n i t o . P a y m e n t . S e t t i n g s W i z a r d   =   n e w   S e t t i n g s W i z a r d ( ) ;  
  
         f u n c t i o n   S e t t i n g s W i z a r d S t e p ( o p t i o n s )   {  
                 i f   ( o p t i o n s )   {  
                         t h i s . n a m e   =   o p t i o n s . n a m e ;  
                         t h i s . a r g s   =   { } ;  
  
                         i f   ( o p t i o n s . n a v i g a t e   i n s t a n c e o f   F u n c t i o n )   {  
                                 t h i s . n a v i g a t e   =   o p t i o n s . n a v i g a t e ;  
                         }  
  
                         i f   ( o p t i o n s . e x e c u t e   i n s t a n c e o f   F u n c t i o n )   {  
                                 t h i s . e x e c u t e   =   o p t i o n s . e x e c u t e ;  
                         }  
  
                         i f   ( o p t i o n s . c a n c e l   i n s t a n c e o f   F u n c t i o n )   {  
                                 t h i s . c a n c e l   =   o p t i o n s . c a n c e l ;  
                         }  
                 }  
         }  
  
         S e t t i n g s W i z a r d S t e p . m i x i n ( {  
                 n a v i g a t e :   f u n c t i o n   ( a r g s )   {   } ,  
  
                 e x e c u t e :   f u n c t i o n   ( d i a l o g ,   a r g s ,   c a l l b a c k )   {  
                         i f   ( c a l l b a c k   i n s t a n c e o f   F u n c t i o n )   {  
                                 c a l l b a c k ( a r g s ) ;  
                         }  
  
                         d i a l o g . c l o s e ( ) ;  
                 } ,  
  
                 c a n c e l :   f u n c t i o n   ( d i a l o g ,   a r g s ,   c a l l b a c k )   {  
                         t h i s . d e f a u l t C a n c e l ( d i a l o g ,   a r g s ,   c a l l b a c k ) ;  
                 } ,  
  
                 d e f a u l t C a n c e l :   f u n c t i o n   ( d i a l o g ,   a r g s ,   c a l l b a c k )   {  
                         i f   ( c a l l b a c k   i n s t a n c e o f   F u n c t i o n )   {  
                                 c a l l b a c k ( a r g s ) ;  
                         }  
  
                         d i a l o g . c l o s e ( ) ;  
                 }  
         } ) ;  
  
         C o g n i t o . P a y m e n t . S e t t i n g s W i z a r d S t e p   =   S e t t i n g s W i z a r d S t e p ;  
  
         / /   s e t u p   t h e   p a y m e n t   s e t t i n g s   w i z a r d   s t e p s  
         f u n c t i o n   s e t u p P a y m e n t S e t t i n g s W i z a r d ( )   {  
                 / /   s e t u p   t h e   w i z a r d  
                 $ ( " . c - p r o c e s s o r - t i t l e " ) . s h o w ( ) ;  
                 C o g n i t o . P a y m e n t . S e t t i n g s W i z a r d . s t e p s   =   [ ] ;  
  
                 C o g n i t o . P a y m e n t . S e t t i n g s W i z a r d . r e g i s t e r ( n e w   C o g n i t o . P a y m e n t . S e t t i n g s W i z a r d S t e p ( {  
                         n a m e :   " S e l e c t P r o c e s s o r " ,  
                         n a v i g a t e :   f u n c t i o n   ( )   {  
  
                                 C o g n i t o . P a y m e n t . p o s t G a t e w a y R e q u e s t ( n u l l ,   " " ,   " " ,   f u n c t i o n   ( )   {  
                                         C o g n i t o . P a y m e n t . m o d e l . p a y m e n t S e t t i n g s . v i e w M o d e l . s e t _ s h o w C h e c k i n g S i g n I n S t a t u s ( f a l s e ) ;  
                                         C o g n i t o . P a y m e n t . m o d e l . p a y m e n t S e t t i n g s . v i e w M o d e l . s e t _ s h o w E x i s t i n g A c c o u n t s ( f a l s e ) ;  
                                         C o g n i t o . P a y m e n t . m o d e l . p a y m e n t S e t t i n g s . v i e w M o d e l . s e t _ s h o w P r o c e s s o r T y p e s ( t r u e ) ;  
                                         C o g n i t o . P a y m e n t . m o d e l . p a y m e n t S e t t i n g s . v i e w M o d e l . s e t _ s h o w L o c a t i o n s ( f a l s e ) ;  
                                         C o g n i t o . P a y m e n t . m o d e l . p a y m e n t S e t t i n g s . v i e w M o d e l . s e t _ c u r r e n t A c c o u n t ( n u l l ) ;  
  
                                         p a y m e n t S e t t i n g s D i a l o g . _ d i a l o g . f i n d ( " . c - m o d a l - b u t t o n : f i r s t " ) . t e x t ( " C a n c e l " ) . s h o w ( ) ;  
                                         p a y m e n t S e t t i n g s D i a l o g . _ d i a l o g . f i n d ( " . c - m o d a l - b u t t o n : l a s t " ) . h i d e ( ) ;  
                                 } ) ;  
                         } ,  
                         e x e c u t e :   f u n c t i o n   ( d i a l o g ,   a r g s ,   c a l l b a c k )   {  
                                 i f   ( C o g n i t o . P a y m e n t . m o d e l . p a y m e n t S e t t i n g s . v i e w M o d e l . g e t _ P a y m e n t A c c o u n t s ( ) . l e n g t h   >   0 )   {  
                                         C o g n i t o . P a y m e n t . S e t t i n g s W i z a r d . n a v i g a t e T o ( " E x i s t i n g A c c o u n t s " ) ;  
                                 }  
                         } ,  
                         c a n c e l :   f u n c t i o n   ( d i a l o g ,   a r g s ,   c a l l b a c k )   {  
                                 i f   ( C o g n i t o . P a y m e n t . m o d e l . p a y m e n t S e t t i n g s . v i e w M o d e l . g e t _ P a y m e n t A c c o u n t s ( ) . l e n g t h   >   0 )   {  
                                         C o g n i t o . P a y m e n t . S e t t i n g s W i z a r d . n a v i g a t e T o ( " E x i s t i n g A c c o u n t s " ) ;  
                                 }   e l s e   {  
                                         t h i s . d e f a u l t C a n c e l ( d i a l o g ,   a r g s ,   c a l l b a c k ) ;  
                                 }  
                         }  
                 } ) ) ;   / /   S e l e c t   P r o c e s s o r  
                 C o g n i t o . P a y m e n t . S e t t i n g s W i z a r d . r e g i s t e r ( n e w   C o g n i t o . P a y m e n t . S e t t i n g s W i z a r d S t e p ( {  
                         n a m e :   " A c c o u n t S e t u p " ,  
                         n a v i g a t e :   f u n c t i o n   ( a r g s )   {  
  
                                 v a r   p a y m e n t A c c o u n t   =   n e w   C o g n i t o . P a y m e n t . P a y m e n t A c c o u n t ( {  
                                         I s A c t i v e :   t r u e ,  
                                         C o u n t r y :   C o g n i t o . c o n f i g . d e f a u l t L o c a l i z a t i o n . g e t _ C o u n t r y ( ) ,  
                                         D e f a u l t C u r r e n c y :   C o g n i t o . c o n f i g . d e f a u l t L o c a l i z a t i o n . g e t _ C u r r e n c y ( ) ,  
                                         P a y m e n t P r o c e s s o r :   C o g n i t o . g e t E n u m W i t h N a m e ( C o g n i t o . P a y m e n t . P a y m e n t P r o c e s s o r ,   a r g s . p r o c e s s o r N a m e ) ,  
                                         P r o c e s s o r N a m e :   a r g s . p r o c e s s o r N a m e ,  
                                         G a t e w a y :   n e w   C o g n i t o . P a y m e n t . P a y m e n t G a t e w a y ( {   P r o c e s s o r :   C o g n i t o . g e t E n u m W i t h N a m e ( C o g n i t o . P a y m e n t . P a y m e n t P r o c e s s o r ,   a r g s . p r o c e s s o r N a m e )   } )  
                                 } ) ;  
  
                                 C o g n i t o . P a y m e n t . m o d e l . p a y m e n t S e t t i n g s . v i e w M o d e l . s e t _ c u r r e n t A c c o u n t ( p a y m e n t A c c o u n t ) ;  
                                 C o g n i t o . P a y m e n t . m o d e l . p a y m e n t S e t t i n g s . v i e w M o d e l . s e t _ s h o w C h e c k i n g S i g n I n S t a t u s ( f a l s e ) ;  
                                 C o g n i t o . P a y m e n t . m o d e l . p a y m e n t S e t t i n g s . v i e w M o d e l . s e t _ s h o w E x i s t i n g A c c o u n t s ( f a l s e ) ;  
                                 C o g n i t o . P a y m e n t . m o d e l . p a y m e n t S e t t i n g s . v i e w M o d e l . s e t _ s h o w P r o c e s s o r T y p e s ( f a l s e ) ;  
                                 C o g n i t o . P a y m e n t . m o d e l . p a y m e n t S e t t i n g s . v i e w M o d e l . s e t _ s h o w L o c a t i o n s ( f a l s e ) ;  
                                 C o g n i t o . P a y m e n t . m o d e l . p a y m e n t S e t t i n g s . v i e w M o d e l . g e t _ c u r r e n t A c c o u n t ( ) . s e t _ S h o w R e m o v e A c c o u n t ( f a l s e ) ;  
  
                                 $ ( " . c - p r o c e s s o r - t i t l e " ) . h i d e ( ) ;  
                                 $ ( " . c - p a y m e n t - g a t e w a y - e d i t o r " ) . s h o w ( ) ;  
  
                                 p a y m e n t S e t t i n g s D i a l o g . _ d i a l o g . f i n d ( " . c - m o d a l - b u t t o n : l a s t " ) . t e x t ( " D o n e " ) . s h o w ( ) ;  
                                 p a y m e n t S e t t i n g s D i a l o g . _ d i a l o g . f i n d ( " . c - m o d a l - b u t t o n : f i r s t " ) . t e x t ( " C a n c e l " ) . s h o w ( ) ;  
                         } ,  
                         e x e c u t e :   f u n c t i o n   ( d i a l o g ,   a r g s ,   c a l l b a c k )   {  
                                 $ ( " . c - p a y m e n t - g a t e w a y - e d i t o r   . c - v a l i d a t i o n " ) . s h o w ( ) ;  
  
                                 i f   ( h a s E r r o r s ( ) )   {  
                                         $ ( " . c - m o d a l - b u t t o n - e x e c u t i n g " ) . r e m o v e C l a s s ( " c - m o d a l - b u t t o n - e x e c u t i n g " ) ;  
                                         r e t u r n ;  
                                 }  
  
                                 v a r   c u r r e n t A c c o u n t   =   C o g n i t o . P a y m e n t . m o d e l . p a y m e n t S e t t i n g s . v i e w M o d e l . g e t _ c u r r e n t A c c o u n t ( ) ;  
  
                                 i f   ( c u r r e n t A c c o u n t . g e t _ P r o c e s s o r N a m e ( )   = = =   " P a y P a l " )   {  
                                         c u r r e n t A c c o u n t . s e t _ N a m e ( c u r r e n t A c c o u n t . g e t _ G a t e w a y ( ) . g e t _ U s e r n a m e ( ) ) ;  
                                 }  
  
                                 m o d u l e . s e r v i c e R e q u e s t ( {  
                                         d a t a T y p e :   " j s o n " ,  
                                         e n d p o i n t :   " P a y m e n t A c c o u n t " ,  
                                         m e t h o d :   " P O S T " ,  
                                         d a t a :   c u r r e n t A c c o u n t ,  
                                         s u c c e s s :   f u n c t i o n   ( d a t a )   {  
                                                 $ ( " . c - p r o c e s s o r - t i t l e " ) . s h o w ( ) ;  
                                                 v a r   v i e w M o d e l   =   g e t A c c o u n t V i e w M o d e l ( C o g n i t o . d e s e r i a l i z e ( C o g n i t o . P a y m e n t . P a y m e n t A c c o u n t ,   d a t a ) ) ;  
  
                                                 i f   ( C o g n i t o . P a y m e n t . m o d e l . p a y m e n t S e t t i n g s . v i e w M o d e l . g e t _ P a y m e n t A c c o u n t s ( ) . l e n g t h   >   1 )   {  
                                                         C o g n i t o . P a y m e n t . S e t t i n g s W i z a r d . n a v i g a t e T o ( " E x i s t i n g A c c o u n t s " ) ;  
                                                 }   e l s e   {  
                                                         c a l l b a c k ( C o g n i t o . s e r i a l i z e ( v i e w M o d e l ) ) ;  
                                                         d i a l o g . c l o s e ( ) ;  
                                                 }  
                                         } ,  
                                         e r r o r :   f u n c t i o n   ( s e n d e r ,   m s g )   {  
                                                 C o g n i t o . P a y m e n t . m o d e l . p a y m e n t S e t t i n g s . v i e w M o d e l . s e t _ v a l i d a t i o n M e s s a g e ( m s g ) ;  
                                                 $ ( " . c - p a y m e n t - s e t t i n g s - e r r o r " ) . s h o w ( ) ;  
                                         }  
                                 } ) ;  
                         } ,  
                         c a n c e l :   f u n c t i o n   ( d i a l o g ,   a r g s ,   c a l l b a c k )   {  
                                 $ ( " . c - p r o c e s s o r - t i t l e " ) . s h o w ( ) ;  
                                 i f   ( C o g n i t o . P a y m e n t . m o d e l . p a y m e n t S e t t i n g s . v i e w M o d e l . g e t _ P a y m e n t A c c o u n t s ( ) . l e n g t h   >   0 )   {  
                                         C o g n i t o . P a y m e n t . S e t t i n g s W i z a r d . n a v i g a t e T o ( " E x i s t i n g A c c o u n t s " ) ;  
                                 }   e l s e   {  
                                         t h i s . d e f a u l t C a n c e l ( d i a l o g ,   a r g s ,   c a l l b a c k ) ;  
                                 }  
                         }  
                 } ) ) ;   / /   A c c o u n t   S e t u p    
                 C o g n i t o . P a y m e n t . S e t t i n g s W i z a r d . r e g i s t e r ( n e w   C o g n i t o . P a y m e n t . S e t t i n g s W i z a r d S t e p ( {  
                         n a m e :   " L o c a t i o n s " ,  
                         n a v i g a t e :   f u n c t i o n   ( a r g s )   {  
                                 v a r   g a t e w a y R e q u e s t   =   a r g s . d a t a ;  
  
                                 C o g n i t o . P a y m e n t . m o d e l . g a t e w a y R e q u e s t   =   g a t e w a y R e q u e s t ;  
  
                                 C o g n i t o . P a y m e n t . m o d e l . p a y m e n t S e t t i n g s . v i e w M o d e l . s e t _ s h o w C h e c k i n g S i g n I n S t a t u s ( f a l s e ) ;  
                                 C o g n i t o . P a y m e n t . m o d e l . p a y m e n t S e t t i n g s . v i e w M o d e l . s e t _ s h o w E x i s t i n g A c c o u n t s ( f a l s e ) ;  
                                 C o g n i t o . P a y m e n t . m o d e l . p a y m e n t S e t t i n g s . v i e w M o d e l . s e t _ s h o w P r o c e s s o r T y p e s ( f a l s e ) ;  
                                 C o g n i t o . P a y m e n t . m o d e l . p a y m e n t S e t t i n g s . v i e w M o d e l . s e t _ s h o w L o c a t i o n s ( t r u e ) ;  
  
                                 p a y m e n t S e t t i n g s D i a l o g . _ d i a l o g . f i n d ( " . c - m o d a l - b u t t o n : l a s t " ) . t e x t ( " S a v e " ) . s h o w ( ) ;  
                         } ,  
                         e x e c u t e :   f u n c t i o n   ( d i a l o g ,   a r g s ,   c a l l b a c k )   {  
                                 v a r   g a t e w a y R e q u e s t I d   =   C o g n i t o . P a y m e n t . m o d e l . p a y m e n t S e t t i n g s . v i e w M o d e l . g e t _ c u r r e n t G a t e w a y R e q u e s t I d ( ) ;  
                                  
                                 C o g n i t o . s e r v i c e R e q u e s t ( {  
                                         d a t a T y p e :   " j s o n " ,  
                                         c o n t e n t T y p e :   " a p p l i c a t i o n / j s o n + c o g n i t o ;   c h a r s e t = u t f - 8 " ,  
                                         e n d p o i n t :   " g a t e w a y / "   +   g a t e w a y R e q u e s t I d   +   " / l o c a t i o n " ,  
                                         m e t h o d :   " P O S T " ,  
                                         d a t a :   C o g n i t o . s e r i a l i z e ( C o g n i t o . P a y m e n t . m o d e l . p a y m e n t S e t t i n g s . v i e w M o d e l . g e t _ l o c a t i o n ( ) ) ,  
                                         m o d u l e :   " p a y m e n t " ,  
                                         s u c c e s s :   f u n c t i o n   ( d a t a )   {  
                                                 v a r   c u r r e n t A c c o u n t   =   C o g n i t o . P a y m e n t . m o d e l . g a t e w a y R e q u e s t . g e t _ P a y m e n t A c c o u n t ( ) ;  
                                                 C o g n i t o . d e s e r i a l i z e ( C o g n i t o . P a y m e n t . P a y m e n t A c c o u n t ,   d a t a ,   c u r r e n t A c c o u n t ) ;  
  
                                                 g e t A c c o u n t V i e w M o d e l ( c u r r e n t A c c o u n t ) ;  
  
                                                 C o g n i t o . P a y m e n t . S e t t i n g s W i z a r d . n a v i g a t e T o ( " C o n n e c t e d T o P r o c e s s o r " ,   {   d a t a :   C o g n i t o . P a y m e n t . m o d e l . g a t e w a y R e q u e s t   } ) ;  
                                         }  
                                 } ) ;  
                         } ,  
                         c a n c e l :   f u n c t i o n   ( d i a l o g ,   a r g s ,   c a l l b a c k )   {  
                                 t h i s . d e f a u l t C a n c e l ( d i a l o g ,   a r g s ,   c a l l b a c k ) ;  
                         }  
                 } ) ) ;   / /   L o c a t i o n s  
                 C o g n i t o . P a y m e n t . S e t t i n g s W i z a r d . r e g i s t e r ( n e w   C o g n i t o . P a y m e n t . S e t t i n g s W i z a r d S t e p ( {  
                         n a m e :   " E x i s t i n g A c c o u n t s " ,  
                         n a v i g a t e :   f u n c t i o n   ( )   {  
                                 C o g n i t o . P a y m e n t . m o d e l . p a y m e n t S e t t i n g s . v i e w M o d e l . s e t _ s h o w C h e c k i n g S i g n I n S t a t u s ( f a l s e ) ;  
                                 C o g n i t o . P a y m e n t . m o d e l . p a y m e n t S e t t i n g s . v i e w M o d e l . s e t _ s h o w P r o c e s s o r T y p e s ( f a l s e ) ;  
                                 C o g n i t o . P a y m e n t . m o d e l . p a y m e n t S e t t i n g s . v i e w M o d e l . s e t _ s h o w E x i s t i n g A c c o u n t s ( t r u e ) ;  
                                 C o g n i t o . P a y m e n t . m o d e l . p a y m e n t S e t t i n g s . v i e w M o d e l . s e t _ s h o w L o c a t i o n s ( f a l s e ) ;  
                                 C o g n i t o . P a y m e n t . m o d e l . p a y m e n t S e t t i n g s . v i e w M o d e l . s e t _ c u r r e n t A c c o u n t ( n u l l ) ;  
                                 p a y m e n t S e t t i n g s D i a l o g . _ d i a l o g . f i n d ( " . c - m o d a l - b u t t o n : f i r s t " ) . t e x t ( " C a n c e l " ) . s h o w ( ) ;  
                                 p a y m e n t S e t t i n g s D i a l o g . _ d i a l o g . f i n d ( " . c - m o d a l - b u t t o n : l a s t " ) . t e x t ( " S a v e " ) . s h o w ( ) ;  
                         } ,  
                         e x e c u t e :   f u n c t i o n   ( d i a l o g ,   a r g s ,   c a l l b a c k )   {  
                                 c a l l b a c k ( C o g n i t o . s e r i a l i z e ( C o g n i t o . P a y m e n t . m o d e l . p a y m e n t S e t t i n g s . v i e w M o d e l . g e t _ e x i s t i n g A c c o u n t ( ) ) ) ;  
                                 d i a l o g . c l o s e ( ) ;  
                         }  
                 } ) ) ;   / /   E x i s t i n g   A c c o u n t s  
                 C o g n i t o . P a y m e n t . S e t t i n g s W i z a r d . r e g i s t e r ( n e w   C o g n i t o . P a y m e n t . S e t t i n g s W i z a r d S t e p ( {  
                         n a m e :   " E d i t A c c o u n t " ,  
                         n a v i g a t e :   f u n c t i o n   ( a r g s )   {  
                                 i f   ( a r g s . m e t a )   {  
                                         f i n a l i z e E d i t A c c o u n t S t e p ( a r g s ) ;  
                                 }   e l s e   {  
                                         l o a d P a y m e n t A c c o u n t ( a r g s . g e t _ I d ( ) ,   n u l l ,   f i n a l i z e E d i t A c c o u n t S t e p ( C o g n i t o . d e s e r i a l i z e ( C o g n i t o . P a y m e n t . P a y m e n t A c c o u n t ,   d a t a ) ) ,   f u n c t i o n   ( d a t a ,   m s g )   {  
                                                 C o g n i t o . P a y m e n t . m o d e l . p a y m e n t S e t t i n g s . v i e w M o d e l . s e t _ v a l i d a t i o n M e s s a g e ( m s g ) ;  
                                                 $ ( " . c - p a y m e n t - s e t t i n g s - e r r o r " ) . s h o w ( ) ;  
                                         } ) ;  
                                 }  
                         } ,  
                         e x e c u t e :   f u n c t i o n   ( d i a l o g ,   a r g s ,   c a l l b a c k )   {  
  
                                 / /   i f   t h e   a c c o u n t   i s   a   s t r i p e   a c c o u n t ,   d o n ' t   u p d a t e   s t o r a g e ,   b e c a u s e   t h e r e   i s   n o t h i n g   t h a t   c a n   b e   e d i t e d   o n   t h e   c l i e n t  
                                 / /   c h a n g e s   t h a t   h a v e   b e e n   m a d e ,   h a v e   b e e n   m a d e   a n d   s t o r e d   a l r e a d y .  
                                 i f   ( C o g n i t o . P a y m e n t . m o d e l . p a y m e n t S e t t i n g s . v i e w M o d e l . g e t _ c u r r e n t A c c o u n t ( ) . g e t _ P r o c e s s o r N a m e ( )   ! = =   " S t r i p e " )   {  
                                         m o d u l e . s e r v i c e R e q u e s t ( {  
                                                 d a t a T y p e :   " j s o n " ,  
                                                 e n d p o i n t :   " P a y m e n t A c c o u n t " ,  
                                                 m e t h o d :   " P O S T " ,  
                                                 d a t a :   C o g n i t o . P a y m e n t . m o d e l . p a y m e n t S e t t i n g s . v i e w M o d e l . g e t _ c u r r e n t A c c o u n t ( ) ,  
                                                 s u c c e s s :   f u n c t i o n   ( )   {  
                                                         i f   ( C o g n i t o . P a y m e n t . m o d e l . p a y m e n t S e t t i n g s . v i e w M o d e l . g e t _ P a y m e n t A c c o u n t s ( ) . l e n g t h   >   1 )   {  
                                                                 C o g n i t o . P a y m e n t . S e t t i n g s W i z a r d . n a v i g a t e T o ( " E x i s t i n g A c c o u n t s " ) ;  
                                                         }   e l s e   {  
                                                                 c a l l b a c k ( C o g n i t o . s e r i a l i z e ( C o g n i t o . P a y m e n t . m o d e l . p a y m e n t S e t t i n g s . v i e w M o d e l . g e t _ c u r r e n t A c c o u n t ( ) ) ) ;  
                                                                 d i a l o g . c l o s e ( ) ;  
                                                         }  
                                                 } ,  
                                                 e r r o r :   f u n c t i o n   ( s e n d e r ,   m s g )   {  
                                                         C o g n i t o . P a y m e n t . m o d e l . p a y m e n t S e t t i n g s . v i e w M o d e l . s e t _ v a l i d a t i o n M e s s a g e ( m s g ) ;  
                                                         $ ( " . c - p a y m e n t - s e t t i n g s - e r r o r " ) . s h o w ( ) ;  
                                                 }  
                                         } ) ;  
                                 }   e l s e   {  
                                         C o g n i t o . P a y m e n t . S e t t i n g s W i z a r d . n a v i g a t e T o ( " E x i s t i n g A c c o u n t s " ) ;  
                                 }  
                         } ,  
                         c a n c e l :   f u n c t i o n   ( d i a l o g ,   a r g s ,   c a l l b a c k )   {  
                                 t h i s . d e f a u l t C a n c e l ( d i a l o g ,   a r g s ,   c a l l b a c k ) ;  
                         }  
                 } ) ) ;   / /   E d i t   A c c o u n t  
                 C o g n i t o . P a y m e n t . S e t t i n g s W i z a r d . r e g i s t e r ( n e w   C o g n i t o . P a y m e n t . S e t t i n g s W i z a r d S t e p ( {  
                         n a m e :   " R e m o v e A c c o u n t " ,  
                         n a v i g a t e :   f u n c t i o n   ( a r g s )   {  
                                 l o a d P a y m e n t A c c o u n t ( a r g s . g e t _ I d ( ) ,   n u l l ,   f u n c t i o n   ( d a t a )   {  
                                         C o g n i t o . P a y m e n t . m o d e l . p a y m e n t S e t t i n g s . v i e w M o d e l . s e t _ s h o w P r o c e s s o r T y p e s ( f a l s e ) ;  
                                         C o g n i t o . P a y m e n t . m o d e l . p a y m e n t S e t t i n g s . v i e w M o d e l . s e t _ s h o w E x i s t i n g A c c o u n t s ( f a l s e ) ;  
                                         C o g n i t o . P a y m e n t . m o d e l . p a y m e n t S e t t i n g s . v i e w M o d e l . s e t _ s h o w L o c a t i o n s ( f a l s e ) ;  
                                         C o g n i t o . P a y m e n t . m o d e l . p a y m e n t S e t t i n g s . v i e w M o d e l . s e t _ c u r r e n t A c c o u n t ( C o g n i t o . d e s e r i a l i z e ( C o g n i t o . P a y m e n t . P a y m e n t A c c o u n t ,   d a t a ) ) ;  
                                         C o g n i t o . P a y m e n t . m o d e l . p a y m e n t S e t t i n g s . v i e w M o d e l . g e t _ c u r r e n t A c c o u n t ( ) . g e t _ G a t e w a y ( ) . s e t _ P a y m e n t A c c o u n t I d ( a r g s . g e t _ I d ( ) ) ;  
                                         C o g n i t o . P a y m e n t . m o d e l . p a y m e n t S e t t i n g s . v i e w M o d e l . g e t _ c u r r e n t A c c o u n t ( ) . s e t _ S h o w R e m o v e A c c o u n t ( t r u e ) ;  
  
                                         p a y m e n t S e t t i n g s D i a l o g . _ d i a l o g . f i n d ( " . c - m o d a l - b u t t o n : f i r s t " ) . t e x t ( " C a n c e l " ) . s h o w ( ) ;  
                                         p a y m e n t S e t t i n g s D i a l o g . _ d i a l o g . f i n d ( " . c - m o d a l - b u t t o n : l a s t " ) . t e x t ( " R e m o v e " ) . s h o w ( ) ;  
                                 } ,   f u n c t i o n   ( d a t a ,   m s g )   {  
                                         C o g n i t o . P a y m e n t . m o d e l . p a y m e n t S e t t i n g s . v i e w M o d e l . s e t _ v a l i d a t i o n M e s s a g e ( m s g ) ;  
                                         $ ( " . c - p a y m e n t - s e t t i n g s - e r r o r " ) . s h o w ( ) ;  
                                 } ) ;  
                         } ,  
                         e x e c u t e :   f u n c t i o n   ( d i a l o g ,   a r g s ,   c a l l b a c k )   {  
                                 m o d u l e . s e r v i c e R e q u e s t ( {  
                                         d a t a T y p e :   " j s o n " ,  
                                         e n d p o i n t :   " P a y m e n t A c c o u n t " ,  
                                         m e t h o d :   " D E L E T E " ,  
                                         d a t a :   {   a c c o u n t I d :   C o g n i t o . P a y m e n t . m o d e l . p a y m e n t S e t t i n g s . v i e w M o d e l . g e t _ c u r r e n t A c c o u n t ( ) . g e t _ I d ( )   } ,  
                                         s u c c e s s :   f u n c t i o n   ( )   {  
  
                                                 v a r   a c c o u n t V i e w M o d e l   =   g e t A c c o u n t V i e w M o d e l ( C o g n i t o . P a y m e n t . m o d e l . p a y m e n t S e t t i n g s . v i e w M o d e l . g e t _ c u r r e n t A c c o u n t ( ) ) ;  
                                                 C o g n i t o . P a y m e n t . m o d e l . p a y m e n t S e t t i n g s . v i e w M o d e l . s e t _ c u r r e n t A c c o u n t ( n u l l ) ;  
  
                                                 i f   ( C o g n i t o . P a y m e n t . m o d e l . p a y m e n t S e t t i n g s . v i e w M o d e l . g e t _ e x i s t i n g A c c o u n t ( )   = =   a c c o u n t V i e w M o d e l )   {  
                                                         C o g n i t o . P a y m e n t . m o d e l . p a y m e n t S e t t i n g s . v i e w M o d e l . s e t _ e x i s t i n g A c c o u n t ( n u l l ) ;  
                                                 }  
                                                 C o g n i t o . P a y m e n t . m o d e l . p a y m e n t S e t t i n g s . v i e w M o d e l . g e t _ P a y m e n t A c c o u n t s ( ) . r e m o v e ( a c c o u n t V i e w M o d e l ) ;  
  
                                                 v a r   a c c o u n t R e f   =   C o g n i t o . s e r i a l i z e ( a c c o u n t V i e w M o d e l ) ;  
                                                 i f   ( d i a l o g A c c o u n t R e m o v e d C a l l b a c k   i n s t a n c e o f   F u n c t i o n )   {  
                                                         d i a l o g A c c o u n t R e m o v e d C a l l b a c k ( a c c o u n t R e f ) ;  
                                                 }  
  
                                                 i f   ( C o g n i t o . P a y m e n t . m o d e l . p a y m e n t S e t t i n g s . v i e w M o d e l . g e t _ P a y m e n t A c c o u n t s ( ) . l e n g t h   >   0 )   {  
                                                         C o g n i t o . P a y m e n t . S e t t i n g s W i z a r d . n a v i g a t e T o ( " E x i s t i n g A c c o u n t s " ) ;  
                                                 }   e l s e   {  
                                                         C o g n i t o . P a y m e n t . S e t t i n g s W i z a r d . n a v i g a t e T o ( " S e l e c t P r o c e s s o r " ) ;  
                                                 }  
                                         } ,  
                                         e r r o r :   f u n c t i o n   ( s e n d e r ,   m s g )   {  
                                                 C o g n i t o . P a y m e n t . m o d e l . p a y m e n t S e t t i n g s . v i e w M o d e l . s e t _ c u r r e n t A c c o u n t ( n u l l ) ;  
                                                 C o g n i t o . P a y m e n t . m o d e l . p a y m e n t S e t t i n g s . v i e w M o d e l . s e t _ v a l i d a t i o n M e s s a g e ( m s g ) ;  
                                                 $ ( " . c - p a y m e n t - s e t t i n g s - e r r o r " ) . s h o w ( ) ;  
                                         }  
                                 } ) ;  
                         } ,  
                         c a n c e l :   f u n c t i o n   ( d i a l o g ,   a r g s ,   c a l l b a c k )   {  
                                 C o g n i t o . P a y m e n t . S e t t i n g s W i z a r d . n a v i g a t e T o ( " E x i s t i n g A c c o u n t s " ) ;  
                         }  
                 } ) ) ;   / /   R e m o v e   A c c o u n t  
                 C o g n i t o . P a y m e n t . S e t t i n g s W i z a r d . r e g i s t e r ( n e w   C o g n i t o . P a y m e n t . S e t t i n g s W i z a r d S t e p ( {  
                         n a m e :   " C o n n e c t e d T o P r o c e s s o r " ,  
                         n a v i g a t e :   f u n c t i o n   ( a r g s )   {  
  
                                 v a r   g a t e w a y R e q u e s t   =   a r g s . d a t a ;  
  
                                 i f   ( g a t e w a y R e q u e s t . g e t _ P a y m e n t A c c o u n t ( ) )   {  
                                         v a r   o r i g i n a l N u m b e r O f A c c o u n t s   =   C o g n i t o . P a y m e n t . m o d e l . p a y m e n t S e t t i n g s . v i e w M o d e l . g e t _ P a y m e n t A c c o u n t s ( ) . l e n g t h ;  
  
                                         p a y m e n t S e t t i n g s D i a l o g . _ d i a l o g . f i n d ( " . c - m o d a l - b u t t o n : l a s t " ) . t e x t ( " D o n e " ) . s h o w ( ) ;  
                                         p a y m e n t S e t t i n g s D i a l o g . _ d i a l o g . f i n d ( " . c - m o d a l - b u t t o n : f i r s t " ) . h i d e ( ) ;  
                                         C o g n i t o . P a y m e n t . m o d e l . p a y m e n t S e t t i n g s . v i e w M o d e l . s e t _ s h o w P r o c e s s o r T y p e s ( f a l s e ) ;  
                                         C o g n i t o . P a y m e n t . m o d e l . p a y m e n t S e t t i n g s . v i e w M o d e l . s e t _ s h o w C h e c k i n g S i g n I n S t a t u s ( f a l s e ) ;  
                                         C o g n i t o . P a y m e n t . m o d e l . p a y m e n t S e t t i n g s . v i e w M o d e l . s e t _ s h o w L o c a t i o n s ( f a l s e ) ;  
  
                                         / /   l o a d   t h e   p a y m e n t   a c c o u n t   v i e w   m o d e l  
                                         C o g n i t o . P a y m e n t . m o d e l . p a y m e n t S e t t i n g s . v i e w M o d e l . s e t _ c u r r e n t A c c o u n t ( g a t e w a y R e q u e s t . g e t _ P a y m e n t A c c o u n t ( ) ) ;  
                                         C o g n i t o . P a y m e n t . m o d e l . p a y m e n t S e t t i n g s . v i e w M o d e l . g e t _ c u r r e n t A c c o u n t ( ) . s e t _ S h o w R e m o v e A c c o u n t ( f a l s e ) ;  
                                         v a r   i n s t r u c t i o n T e x t   =   " < p > C o n g r a t u l a t i o n s !   Y o u r   f o r m   i s   n o w   c o n n e c t e d   t o   "   +   g a t e w a y R e q u e s t . g e t _ P a y m e n t A c c o u n t ( ) . g e t _ P r o c e s s o r N a m e ( )   +   " ! < / p > " ;  
  
                                         i f   ( g a t e w a y R e q u e s t . g e t _ P a y m e n t A c c o u n t ( ) . g e t _ P r o c e s s o r N a m e ( )   = = =   " S q u a r e " )   {  
                                         	 i n s t r u c t i o n T e x t   + =   " < p > < s t r o n g > I m p o r t a n t   N e x t   S t e p s : < / s t r o n g > < b r / > T o   b e   e l i g i b l e   f o r   S q u a r e ' s   C h a r g e b a c k   P r o t e c t i o n ,   y o u   < s t r o n g > m u s t < / s t r o n g >   m a p   t h e   b u y e r ' s   e m a i l   a d d r e s s   a n d   s h i p p i n g   o r   b i l l i n g   a d d r e s s   u n d e r   y o u r   f o r m ' s   p a y m e n t   s e t t i n g s .   < a   h r e f = ' h t t p s : / / w w w . c o g n i t o f o r m s . c o m / s u p p o r t / 5 8 / c o l l e c t i n g - p a y m e n t / h o w - t o - c r e a t e - a - p a y m e n t - f o r m # m a p - b i l l i n g - f i e l d s - s t r i p e - s q u a r e - o n l y '   t a r g e t = ' _ b l a n k ' > L e a r n   m o r e . < / a > < / p > " ;  
                                         }  
  
                                         C o g n i t o . P a y m e n t . m o d e l . p a y m e n t S e t t i n g s . v i e w M o d e l . s e t _ e x i s t i n g A c c o u n t ( g e t A c c o u n t V i e w M o d e l ( g a t e w a y R e q u e s t . g e t _ P a y m e n t A c c o u n t ( ) ) ) ;  
  
                                         i f   ( g a t e w a y R e q u e s t . g e t _ R e s p o n s e M e s s a g e ( ) )   {  
                                                 i n s t r u c t i o n T e x t   + =   " < b r   / > "   +   g a t e w a y R e q u e s t . g e t _ R e s p o n s e M e s s a g e ( )  
                                         }  
  
                                         $ ( " . c - p a y m e n t - a c c o u n t - i n s t r u c t i o n s " ) . h t m l ( i n s t r u c t i o n T e x t ) ;  
  
                                         $ ( " . c - p a y m e n t - g a t e w a y - e d i t o r " ) . h i d e ( ) ;  
                                 }   e l s e   {  
                                         C o g n i t o . P a y m e n t . m o d e l . p a y m e n t S e t t i n g s . v i e w M o d e l . s e t _ v a l i d a t i o n M e s s a g e ( g a t e w a y R e q u e s t . g e t _ R e s p o n s e M e s s a g e ( ) ) ;  
                                         $ ( " . c - p a y m e n t - s e t t i n g s - e r r o r " ) . s h o w ( ) ;  
                                 }  
                         } ,  
                         e x e c u t e :   f u n c t i o n   ( d i a l o g ,   a r g s ,   c a l l b a c k )   {  
                                 i f   ( C o g n i t o . P a y m e n t . m o d e l . p a y m e n t S e t t i n g s . v i e w M o d e l . g e t _ P a y m e n t A c c o u n t s ( ) . l e n g t h   = =   1 )   {  
                                         c a l l b a c k ( C o g n i t o . s e r i a l i z e ( C o g n i t o . P a y m e n t . m o d e l . p a y m e n t S e t t i n g s . v i e w M o d e l . g e t _ P a y m e n t A c c o u n t s ( ) [ 0 ] ) ) ;  
                                         d i a l o g . c l o s e ( ) ;  
                                 }   e l s e   {  
                                         C o g n i t o . P a y m e n t . S e t t i n g s W i z a r d . n a v i g a t e T o ( " E x i s t i n g A c c o u n t s " ) ;  
                                 }  
                         }  
                 } ) ) ;   / /   C o n n e c t e d   T o   P r o c e s s o r  
                 C o g n i t o . P a y m e n t . S e t t i n g s W i z a r d . r e g i s t e r ( n e w   C o g n i t o . P a y m e n t . S e t t i n g s W i z a r d S t e p ( {  
                         n a m e :   " R e m o v e A c c o u n t " ,  
                         n a v i g a t e :   f u n c t i o n   ( a r g s )   {  
                                 l o a d P a y m e n t A c c o u n t ( a r g s . g e t _ I d ( ) ,   n u l l ,   f u n c t i o n   ( d a t a )   {  
                                         C o g n i t o . P a y m e n t . m o d e l . p a y m e n t S e t t i n g s . v i e w M o d e l . s e t _ s h o w P r o c e s s o r T y p e s ( f a l s e ) ;  
                                         C o g n i t o . P a y m e n t . m o d e l . p a y m e n t S e t t i n g s . v i e w M o d e l . s e t _ s h o w E x i s t i n g A c c o u n t s ( f a l s e ) ;  
                                         C o g n i t o . P a y m e n t . m o d e l . p a y m e n t S e t t i n g s . v i e w M o d e l . s e t _ c u r r e n t A c c o u n t ( C o g n i t o . d e s e r i a l i z e ( C o g n i t o . P a y m e n t . P a y m e n t A c c o u n t ,   d a t a ) ) ;  
                                         C o g n i t o . P a y m e n t . m o d e l . p a y m e n t S e t t i n g s . v i e w M o d e l . g e t _ c u r r e n t A c c o u n t ( ) . g e t _ G a t e w a y ( ) . s e t _ P a y m e n t A c c o u n t I d ( a r g s . g e t _ I d ( ) ) ;  
                                         C o g n i t o . P a y m e n t . m o d e l . p a y m e n t S e t t i n g s . v i e w M o d e l . g e t _ c u r r e n t A c c o u n t ( ) . s e t _ S h o w R e m o v e A c c o u n t ( t r u e ) ;  
  
                                         p a y m e n t S e t t i n g s D i a l o g . _ d i a l o g . f i n d ( " . c - m o d a l - b u t t o n : f i r s t " ) . t e x t ( " C a n c e l " ) . s h o w ( ) ;  
                                         p a y m e n t S e t t i n g s D i a l o g . _ d i a l o g . f i n d ( " . c - m o d a l - b u t t o n : l a s t " ) . t e x t ( " R e m o v e " ) . s h o w ( ) ;  
                                 } ,   f u n c t i o n   ( d a t a ,   m s g )   {  
                                         C o g n i t o . P a y m e n t . m o d e l . p a y m e n t S e t t i n g s . v i e w M o d e l . s e t _ v a l i d a t i o n M e s s a g e ( m s g ) ;  
                                         $ ( " . c - p a y m e n t - s e t t i n g s - e r r o r " ) . s h o w ( ) ;  
                                 } ) ;  
                         } ,  
                         e x e c u t e :   f u n c t i o n   ( d i a l o g ,   a r g s ,   c a l l b a c k )   {  
                                 m o d u l e . s e r v i c e R e q u e s t ( {  
                                         d a t a T y p e :   " j s o n " ,  
                                         e n d p o i n t :   " P a y m e n t A c c o u n t " ,  
                                         m e t h o d :   " D E L E T E " ,  
                                         d a t a :   {   a c c o u n t I d :   C o g n i t o . P a y m e n t . m o d e l . p a y m e n t S e t t i n g s . v i e w M o d e l . g e t _ c u r r e n t A c c o u n t ( ) . g e t _ I d ( )   } ,  
                                         s u c c e s s :   f u n c t i o n   ( )   {  
  
                                                 v a r   a c c o u n t V i e w M o d e l   =   g e t A c c o u n t V i e w M o d e l ( C o g n i t o . P a y m e n t . m o d e l . p a y m e n t S e t t i n g s . v i e w M o d e l . g e t _ c u r r e n t A c c o u n t ( ) ) ;  
                                                 C o g n i t o . P a y m e n t . m o d e l . p a y m e n t S e t t i n g s . v i e w M o d e l . s e t _ c u r r e n t A c c o u n t ( n u l l ) ;  
  
                                                 i f   ( C o g n i t o . P a y m e n t . m o d e l . p a y m e n t S e t t i n g s . v i e w M o d e l . g e t _ e x i s t i n g A c c o u n t ( )   = =   a c c o u n t V i e w M o d e l )   {  
                                                         C o g n i t o . P a y m e n t . m o d e l . p a y m e n t S e t t i n g s . v i e w M o d e l . s e t _ e x i s t i n g A c c o u n t ( n u l l ) ;  
                                                 }  
                                                 C o g n i t o . P a y m e n t . m o d e l . p a y m e n t S e t t i n g s . v i e w M o d e l . g e t _ P a y m e n t A c c o u n t s ( ) . r e m o v e ( a c c o u n t V i e w M o d e l ) ;  
  
                                                 v a r   a c c o u n t R e f   =   C o g n i t o . s e r i a l i z e ( a c c o u n t V i e w M o d e l ) ;  
                                                 i f   ( d i a l o g A c c o u n t R e m o v e d C a l l b a c k   i n s t a n c e o f   F u n c t i o n )   {  
                                                         d i a l o g A c c o u n t R e m o v e d C a l l b a c k ( a c c o u n t R e f ) ;  
                                                 }  
  
                                                 i f   ( C o g n i t o . P a y m e n t . m o d e l . p a y m e n t S e t t i n g s . v i e w M o d e l . g e t _ P a y m e n t A c c o u n t s ( ) . l e n g t h   >   0 )   {  
                                                         C o g n i t o . P a y m e n t . S e t t i n g s W i z a r d . n a v i g a t e T o ( " E x i s t i n g A c c o u n t s " ) ;  
                                                 }   e l s e   {  
                                                         C o g n i t o . P a y m e n t . S e t t i n g s W i z a r d . n a v i g a t e T o ( " S e l e c t P r o c e s s o r " ) ;  
                                                 }  
                                         } ,  
                                         e r r o r :   f u n c t i o n   ( s e n d e r ,   m s g )   {  
                                                 C o g n i t o . P a y m e n t . m o d e l . p a y m e n t S e t t i n g s . v i e w M o d e l . s e t _ c u r r e n t A c c o u n t ( n u l l ) ;  
                                                 C o g n i t o . P a y m e n t . m o d e l . p a y m e n t S e t t i n g s . v i e w M o d e l . s e t _ v a l i d a t i o n M e s s a g e ( m s g ) ;  
                                                 $ ( " . c - p a y m e n t - s e t t i n g s - e r r o r " ) . s h o w ( ) ;  
                                         }  
                                 } ) ;  
                         } ,  
                         c a n c e l :   f u n c t i o n   ( d i a l o g ,   a r g s ,   c a l l b a c k )   {  
                                 C o g n i t o . P a y m e n t . S e t t i n g s W i z a r d . n a v i g a t e T o ( " E x i s t i n g A c c o u n t s " ) ;  
                         }  
                 } ) ) ;   / /   R e m o v e   A c c o u n t  
                 C o g n i t o . P a y m e n t . S e t t i n g s W i z a r d . r e g i s t e r ( n e w   C o g n i t o . P a y m e n t . S e t t i n g s W i z a r d S t e p ( {  
                         n a m e :   " C h e c k S t a t u s " ,  
                         n a v i g a t e :   f u n c t i o n   ( a r g s )   {  
                                 $ ( " . c - p a y m e n t - s e t t i n g s - s i g n i n - p r o c e s s o r " ) . h t m l ( a r g s . p r o c e s s o r ) ;  
                                 $ ( " . c - p a y m e n t - s e t t i n g s - s i g n i n - i n s t r u c t i o n s " ) . h t m l ( " " ) ;  
  
                                 C o g n i t o . P a y m e n t . m o d e l . p a y m e n t S e t t i n g s . v i e w M o d e l . s e t _ s h o w C h e c k i n g S i g n I n S t a t u s ( t r u e ) ;  
                                 C o g n i t o . P a y m e n t . m o d e l . p a y m e n t S e t t i n g s . v i e w M o d e l . s e t _ s h o w E x i s t i n g A c c o u n t s ( f a l s e ) ;  
                                 C o g n i t o . P a y m e n t . m o d e l . p a y m e n t S e t t i n g s . v i e w M o d e l . s e t _ s h o w P r o c e s s o r T y p e s ( f a l s e ) ;  
                                 C o g n i t o . P a y m e n t . m o d e l . p a y m e n t S e t t i n g s . v i e w M o d e l . s e t _ c u r r e n t A c c o u n t ( n u l l ) ;  
  
                                 p a y m e n t S e t t i n g s D i a l o g . _ d i a l o g . f i n d ( " . c - m o d a l - b u t t o n : l a s t " ) . t e x t ( " S a v e " ) . h i d e ( ) ;  
                         } ,  
                         c a n c e l :   f u n c t i o n   ( )   {  
                                 $ ( " . c - p r o c e s s o r - t i t l e " ) . s h o w ( ) ;  
                                 i f   ( C o g n i t o . P a y m e n t . m o d e l . p a y m e n t S e t t i n g s . v i e w M o d e l . g e t _ P a y m e n t A c c o u n t s ( ) . l e n g t h   >   0 )   {  
                                         C o g n i t o . P a y m e n t . S e t t i n g s W i z a r d . n a v i g a t e T o ( " E x i s t i n g A c c o u n t s " ) ;  
                                 }   e l s e   {  
                                         C o g n i t o . P a y m e n t . S e t t i n g s W i z a r d . n a v i g a t e T o ( " S e l e c t P r o c e s s o r " ) ;  
                                 }  
                         }  
                 } ) ) ;   / /   C h e c k   S t a t u s  
         }  
         / / # e n d r e g i o n  
  
         / / # r e g i o n   V a r i a b l e s / S e t u p  
  
         / /   G l o b a l   o b j e c t s  
         v a r   m o d u l e ;  
         v a r   p a y m e n t S e t t i n g s D i a l o g ;  
         v a r   d i a l o g S a v e C a l l b a c k ;  
         v a r   d i a l o g C a n c e l C a l l b a c k ;  
         v a r   d i a l o g A c c o u n t R e m o v e d C a l l b a c k ;  
  
         / /   S e t u p   v a r i a b l e s   a f t e r   t y p e s   h a v e   l o a d e d  
         C o g n i t o . m o d e l R e a d y ( f u n c t i o n   ( )   {  
                 m o d u l e   =   C o g n i t o . c o n f i g . m o d u l e s [ 1 ] ;  
                 C o g n i t o . P a y m e n t . m o d e l . p a y m e n t S e t t i n g s   =   n e w   O b j e c t ( ) ;  
                 C o g n i t o . P a y m e n t . m o d e l . p a y m e n t S e t t i n g s . v i e w M o d e l   =   u n d e f i n e d ;  
  
                 p a y m e n t S e t t i n g s D i a l o g   =   $ . f n . d i a l o g ( {  
                         t i t l e :   " P a y m e n t   A c c o u n t   S e t t i n g s " ,  
                         i n s t a n c e :   " C o g n i t o . "   +   m o d u l e . n a m e . c h a r A t ( 0 ) . t o U p p e r C a s e ( )   +   m o d u l e . n a m e . s l i c e ( 1 )   +   " . m o d e l . p a y m e n t S e t t i n g s " ,  
                         w i d t h :   7 0 0 ,  
                         h e i g h t :   5 2 5 ,  
                         t e m p l a t e N a m e :   " p a y m e n t - s e t t i n g s " ,  
                         i n c l u d e C l o s e B u t t o n :   t r u e ,  
                         c l o s e O n E s c a p e :   f a l s e ,  
                         b u t t o n s :   [  
                                 {  
                                         l a b e l :   " C a n c e l " ,  
                                         i s C a n c e l :   t r u e ,  
                                         a u t o C l o s e :   f a l s e ,  
                                         c l i c k :   f u n c t i o n   ( )   {   C o g n i t o . P a y m e n t . s e t t i n g s D i a l o g C a n c e l ( t h i s ,   d i a l o g C a n c e l C a l l b a c k ) ;   }  
                                 } ,  
                                 {  
                                         l a b e l :   " S a v e " ,  
                                         a u t o C l o s e :   f a l s e ,  
                                         c l i c k :   f u n c t i o n   ( )   {   C o g n i t o . P a y m e n t . s e t t i n g s D i a l o g C o m p l e t e ( t h i s ,   d i a l o g S a v e C a l l b a c k ) ;   }  
                                 }  
  
  
                         ]  
                 } ) ;  
                 p a y m e n t S e t t i n g s D i a l o g . _ d e f a u l t B u t t o n   =   n u l l ;  
         } ) ;  
  
         / / # e n d r e g i o n  
  
         / / # r e g i o n   M o d e l   T y p e   D e f i n i t i o n s  
  
         $ e x t e n d ( " C o g n i t o . P a y m e n t . P a y m e n t C o n f i g u r a t i o n V i e w M o d e l " ,   f u n c t i o n   ( c o n f i g V i e w M o d e l )   {  
  
                 c o n f i g V i e w M o d e l . m e t a . a d d P r o p e r t y ( {   n a m e :   " c u r r e n t G a t e w a y R e q u e s t I d " ,   t y p e :   S t r i n g   } ) ;  
  
                 c o n f i g V i e w M o d e l . m e t a  
                         . a d d P r o p e r t y ( {   n a m e :   " e x i s t i n g A c c o u n t " ,   t y p e :   C o g n i t o . P a y m e n t . P a y m e n t A c c o u n t V i e w M o d e l   } )  
                         . a d d C h a n g e d ( f u n c t i o n   ( o b j ,   a r g s )   {  
  
                                 / /   i f   t h e   v a l u e   i s   s e t   t o   n u l l ,   m a k e   s u r e   t o   e m p t y   o u t   t h e   o t h e r   p r o p e r t i e s  
                                 i f   ( ! a r g s . n e w V a l u e )   {  
                                         i f   ( C o g n i t o . P a y m e n t . m o d e l . p a y m e n t S e t t i n g s . v i e w M o d e l . g e t _ c u r r e n t A c c o u n t ( ) )   {  
                                                 C o g n i t o . P a y m e n t . m o d e l . p a y m e n t S e t t i n g s . v i e w M o d e l . g e t _ c u r r e n t A c c o u n t ( ) . g e t _ G a t e w a y ( ) . s e t _ P a y m e n t A c c o u n t I d ( n u l l ) ;  
                                                 C o g n i t o . P a y m e n t . m o d e l . p a y m e n t S e t t i n g s . v i e w M o d e l . s e t _ c u r r e n t A c c o u n t ( n u l l ) ;  
                                         }  
                                 }  
                         } )  
                         . a l l o w e d V a l u e s ( " P a y m e n t A c c o u n t s " ) ;  
  
                 c o n f i g V i e w M o d e l . m e t a . a d d P r o p e r t y ( {   n a m e :   " c u r r e n t A c c o u n t " ,   t y p e :   C o g n i t o . P a y m e n t . P a y m e n t A c c o u n t   } ) ;  
                 c o n f i g V i e w M o d e l . m e t a . a d d P r o p e r t y ( {   n a m e :   " s h o w P r o c e s s o r T y p e s " ,   t y p e :   B o o l e a n   } ) ;  
                 c o n f i g V i e w M o d e l . m e t a . a d d P r o p e r t y ( {   n a m e :   " s h o w L o c a t i o n s " ,   t y p e :   B o o l e a n   } ) ;  
                 c o n f i g V i e w M o d e l . m e t a . a d d P r o p e r t y ( {   n a m e :   " s h o w E x i s t i n g A c c o u n t s " ,   t y p e :   B o o l e a n   } ) ;  
                 c o n f i g V i e w M o d e l . m e t a . a d d P r o p e r t y ( {   n a m e :   " v a l i d a t i o n M e s s a g e " ,   t y p e :   S t r i n g   } ) ;  
                 c o n f i g V i e w M o d e l . m e t a . a d d P r o p e r t y ( {   n a m e :   " s h o w C h e c k i n g S i g n I n S t a t u s " ,   t y p e :   B o o l e a n   } ) ;  
  
                 c o n f i g V i e w M o d e l . m e t a . a d d P r o p e r t y ( {   n a m e :   " a v a i l a b l e L o c a t i o n s " ,   t y p e :   C o g n i t o . P a y m e n t . P a y m e n t L o c a t i o n ,   i s L i s t :   t r u e   } )  
                         . c a l c u l a t e d ( {  
                                 c a l c u l a t e :   f u n c t i o n   ( )   {  
                                         i f   ( ! t h i s . g e t _ c u r r e n t G a t e w a y R e q u e s t I d ( )   | |   ! t h i s . g e t _ s h o w L o c a t i o n s ( ) )   {  
                                                 r e t u r n   [ ] ;  
                                         }  
  
                                         v a r   _ t h i s   =   t h i s ;  
  
                                         C o g n i t o . P a y m e n t . g e t M e r c h a n t ( t h i s . g e t _ c u r r e n t G a t e w a y R e q u e s t I d ( ) ,   f u n c t i o n   ( m e r c h a n t )   {  
                                                 _ t h i s . g e t _ a v a i l a b l e L o c a t i o n s ( ) . c l e a r ( ) ;  
  
                                                 / /   O n l y   a d d   p a y m e n t   a c c o u n t s   f o r   l o c a t i o n s   t h a t   h a v e   n o t   a l r e a d y   b e e n   a d d e d  
                                                 v a r   d e f a u l t L o c a t i o n   =   n u l l ;  
                                                 $ . e a c h ( m e r c h a n t . g e t _ L o c a t i o n s ( ) ,   f u n c t i o n   ( i n d e x ,   l o c )   {  
                                                         i f   ( _ t h i s . g e t _ P a y m e n t A c c o u n t s ( ) . f i r s t ( f u n c t i o n   ( p a )   {   r e t u r n   p a . g e t _ L o c a t i o n ( )   & &   p a . g e t _ L o c a t i o n ( ) . g e t _ I d ( )   = = =   l o c . g e t _ I d ( )   } )   = = =   n u l l )   {  
                                                                 d e f a u l t L o c a t i o n   =   d e f a u l t L o c a t i o n   | |   l o c ;  
                                                                 _ t h i s . g e t _ a v a i l a b l e L o c a t i o n s ( ) . a d d ( l o c ) ;  
                                                         }  
                                                 } ) ;  
  
                                                 _ t h i s . s e t _ l o c a t i o n ( d e f a u l t L o c a t i o n ) ;  
                                         } ) ;  
                                 } ,  
                                 o n C h a n g e O f :   [ " s h o w L o c a t i o n s " ]  
                         } ) ;  
  
                 c o n f i g V i e w M o d e l . m e t a . a d d P r o p e r t y ( {   n a m e :   " l o c a t i o n " ,   t y p e :   C o g n i t o . P a y m e n t . P a y m e n t L o c a t i o n   } ) . a l l o w e d V a l u e s ( " a v a i l a b l e L o c a t i o n s " ) ;  
  
         } ) ;  
    
         $ e x t e n d ( " C o g n i t o . P a y m e n t . P a y m e n t A c c o u n t " ,   f u n c t i o n   ( t y p e )   {  
                 t y p e . $ P a y m e n t P r o c e s s o r  
                         . a d d C h a n g e d ( f u n c t i o n   ( o b j ,   a r g s )   {  
                                 i f   ( o b j   & &   a r g s . n e w V a l u e )   {  
                                         v a r   p r o c e s s o r N a m e   =   a r g s . n e w V a l u e . g e t _ N a m e ( ) ;  
  
                                         i f   ( ! o b j . g e t _ G a t e w a y ( ) )   {  
                                                 E x o W e b . O b s e r v e r . s e t V a l u e ( o b j ,   " G a t e w a y " ,   n e w   C o g n i t o . P a y m e n t . P a y m e n t G a t e w a y ( ) ) ;  
                                         }  
  
                                         o b j . s e t _ U s e G a t e w a y P r o c e s s i n g ( f a l s e ) ;  
                                         o b j . g e t _ G a t e w a y ( ) . s e t _ P r o c e s s o r ( a r g s . n e w V a l u e ) ;  
                                         o b j . g e t _ G a t e w a y ( ) . s e t _ e C h e c k A v a i l a b l e ( f a l s e ) ;  
  
                                         s w i t c h   ( p r o c e s s o r N a m e )   {  
                                                 c a s e   " S C G o v " :  
                                                         o b j . s e t _ U s e G a t e w a y P r o c e s s i n g ( t r u e ) ;  
                                                         b r e a k ;  
                                                 c a s e   " A u t h o r i z e N e t " :  
                                                         o b j . g e t _ G a t e w a y ( ) . s e t _ e C h e c k A v a i l a b l e ( t r u e ) ;  
                                                         b r e a k ;  
                                                 c a s e   " C o g n i t o D e m o " :  
                                                         o b j . g e t _ G a t e w a y ( ) . s e t _ L o g i n ( " C o g n i t o " ) ;  
                                                         b r e a k ;  
                                         }  
                                 }  
                         } )  
                         . a l l o w e d V a l u e s ( " C o g n i t o . P a y m e n t . P a y m e n t P r o c e s s o r . A l l " ) ;  
  
                 t y p e . $ N a m e . u n i q u e ( C o g n i t o . P a y m e n t . m o d e l . c o n f i g ,   " P a y m e n t A c c o u n t s " ) ;  
  
                 t y p e . $ P r o c e s s i n g T y p e . a l l o w e d V a l u e s ( " C o g n i t o . P a y m e n t . P a y m e n t P r o c e s s i n g T y p e . A l l " ) ;  
                 t y p e . $ P r o c e s s i n g T y p e . r e q u i r e d I f ( " U s e G a t e w a y P r o c e s s i n g " ,   " E q u a l s " ,   f a l s e ,   " r e q u i r e d " ) ;  
                 t y p e . $ P r o c e s s i n g E n d P o i n t . r e q u i r e d I f ( " P r o c e s s i n g T y p e . I d " ,   " E q u a l s " ,   " R e a l T i m e P u s h " ,   " r e q u i r e d " ) ;  
                 t y p e . $ B a t c h C u t o f f T i m e . r e q u i r e d I f ( " P r o c e s s i n g T y p e . I d " ,   " E q u a l s " ,   " B a t c h D o w n l o a d " ,   " r e q u i r e d " ) ;  
  
                 t y p e . m e t a . a d d P r o p e r t y ( {  
                         n a m e :   " I n s t r u c t i o n T e x t " ,  
                         t y p e :   S t r i n g  
                 } ) ;  
  
                 t y p e . m e t a . a d d P r o p e r t y ( {  
                         n a m e :   " S h o w R e m o v e A c c o u n t " ,  
                         t y p e :   B o o l e a n  
                 } ) ;  
         } ) ;  
  
         $ e x t e n d ( " C o g n i t o . P a y m e n t . P a y m e n t G a t e w a y " ,   f u n c t i o n   ( t y p e )   {  
  
                 t y p e . m e t a . a d d P r o p e r t y ( {  
                         n a m e :   " A v a i l a b l e P a y m e n t M e t h o d s " ,  
                         t y p e :   C o g n i t o . P a y m e n t . P a y m e n t M e t h o d ,  
                         i s L i s t :   t r u e  
                 } ) . c a l c u l a t e d ( {  
                         f n :   f u n c t i o n   ( )   {  
                                 v a r   a v a i l M e t h o d s   =   [ ] ;  
                                 v a r   g a t e w a y   =   t h i s ;  
                                 $ . e a c h ( C o g n i t o . P a y m e n t . P a y m e n t M e t h o d . g e t _ A l l ( ) ,   f u n c t i o n   ( )   {  
                                         i f   ( t h i s . g e t _ I d ( )   ! =   0   & &   ( g a t e w a y . g e t _ e C h e c k A v a i l a b l e ( )   | |   t h i s . g e t _ I d ( )   ! =   5 ) )   {  
                                                 a v a i l M e t h o d s . p u s h ( t h i s ) ;  
                                         }  
                                 } ) ;  
  
                                 r e t u r n   a v a i l M e t h o d s ;  
  
                         } ,   o n C h a n g e O f :   [ " e C h e c k A v a i l a b l e " ]  
                 } ) ;  
  
                 t y p e . m e t a . a d d P r o p e r t y ( {  
                         n a m e :   " P a s s w o r d R e q u i r e d " ,  
                         t y p e :   B o o l e a n  
                 } ) . c a l c u l a t e d ( {  
                         f n :   f u n c t i o n   ( )   {  
                                 i f   ( t h i s . g e t _ P r o c e s s o r ( ) )   {  
                                         i f   ( t h i s . g e t _ P r o c e s s o r ( ) . g e t _ N a m e ( )   = = =   " A u t h o r i z e N e t " )   {  
                                                 i f   ( ! t h i s . g e t _ T r a n s a c t i o n K e y ( ) )   {  
                                                         r e t u r n   t r u e ;  
                                                 }  
                                         }   e l s e   i f   ( t h i s . g e t _ P r o c e s s o r ( ) . g e t _ N a m e ( )   = = =   " F i r s t D a t a W e b S e r v i c e A P I " )   {  
                                                 r e t u r n   t r u e ;  
                                         }  
                                 }  
  
                                 r e t u r n   f a l s e ;  
                         } ,   o n C h a n g e O f :   [ " P r o c e s s o r " ,   " T r a n s a c t i o n K e y " ]  
                 } ) ;  
  
                 t y p e . m e t a . a d d P r o p e r t y ( {  
                         n a m e :   " T r a n s a c t i o n K e y R e q u i r e d " ,  
                         t y p e :   B o o l e a n  
                 } ) . c a l c u l a t e d ( {  
                         f n :   f u n c t i o n   ( )   {  
                                 i f   ( t h i s . g e t _ P r o c e s s o r ( ) )   {  
                                         i f   ( t h i s . g e t _ P r o c e s s o r ( ) . g e t _ N a m e ( )   = = =   " A u t h o r i z e N e t " )   {  
                                                 i f   ( ! t h i s . g e t _ P a s s w o r d ( ) )   {  
                                                         r e t u r n   t r u e ;  
                                                 }  
                                         }  
                                 }  
  
                                 r e t u r n   f a l s e ;  
                         } ,   o n C h a n g e O f :   [ " P r o c e s s o r " ,   " P a s s w o r d " ]  
                 } ) ;  
  
                 t y p e . m e t a . a d d P r o p e r t y ( {  
                         n a m e :   " u s e r n a m e R e q u i r e d " ,  
                         t y p e :   B o o l e a n  
                 } ) . c a l c u l a t e d ( {  
                         f n :   f u n c t i o n   ( )   {  
                                 r e t u r n   t h i s . g e t _ P r o c e s s o r ( )   & &   t h i s . g e t _ P r o c e s s o r ( ) . g e t _ N a m e ( )   = = =   " P a y P a l " ;  
                         } ,   o n C h a n g e O f :   [ " P r o c e s s o r " ]  
                 } ) ;  
  
                 t y p e . m e t a . a d d P r o p e r t y ( {  
                         n a m e :   " P a y m e n t A c c o u n t I d " ,   t y p e :   S t r i n g  
                 } ) ;  
  
                 t y p e . m e t a . a d d P r o p e r t y ( {  
                         n a m e :   " p a y P a l E m a i l " ,   t y p e :   S t r i n g ,   l a b e l :   " E m a i l   A d d r e s s "  
                 } ) . a d d C h a n g e d ( f u n c t i o n   ( o b j ,   a r g s )   {  
                         o b j . s e t _ U s e r n a m e ( a r g s . n e w V a l u e ) ;  
                 } ) . s t r i n g F o r m a t ( " n a m e @ d o m a i n . c o m " ,   " ^ \ \ s * ( [ a - z A - Z 0 - 9 \ \ ! \ \ # \ \ $ \ \ % \ \ & \ \ ' \ \ * \ \ + \ \ - \ \ / \ \ = \ \ ? \ \ ^ _ \ \ ` \ \ { \ \ | \ \ } \ \ ~ ] + ( \ \ . [ a - z A - Z 0 - 9 \ \ ! \ \ # \ \ $ \ \ % \ \ & \ \ ' \ \ * \ \ + \ \ - \ \ / \ \ = \ \ ? \ \ ^ _ \ \ ` \ \ { \ \ | \ \ } \ \ ~ ] + ) * @ ( [ a - z A - Z 0 - 9 ] ( [ a - z A - Z 0 - 9 - ] { 0 , 6 1 } [ a - z A - Z 0 - 9 ] ) ? ( \ \ . [ a - z A - Z 0 - 9 ] ( [ a - z A - Z 0 - 9 - ] { 0 , 6 1 } [ a - z A - Z 0 - 9 ] ) ? ) * \ \ . [ a - z A - Z ] { 2 , 2 0 } | ( [ 0 - 9 ] { 1 , 3 } ( \ \ . [ 0 - 9 ] { 1 , 3 } ) { 3 } ) ) ) \ \ s * $ " ,   " $ 1 " )  
                         . r e q u i r e d I f ( " u s e r n a m e R e q u i r e d " ,   " E q u a l s " ,   t r u e ,   " E m a i l   A d d r e s s   i s   r e q u i r e d . " ) ;  
  
                 t y p e . $ A c c e p t e d P a y m e n t M e t h o d s . a l l o w e d V a l u e s ( " A v a i l a b l e P a y m e n t M e t h o d s " ) ;  
  
                 t y p e . $ P a s s w o r d . r e q u i r e d I f ( " P a s s w o r d R e q u i r e d " ,   " E q u a l s " ,   t r u e ,   " r e q u i r e d " ) ;  
                 t y p e . $ T r a n s a c t i o n K e y . r e q u i r e d I f ( " T r a n s a c t i o n K e y R e q u i r e d " ,   " E q u a l s " ,   t r u e ,   " r e q u i r e d " ) ;  
                 t y p e . $ U s e r n a m e . r e q u i r e d I f ( " u s e r n a m e R e q u i r e d " ,   " E q u a l s " ,   t r u e ,   " U s e r n a m e   i s   r e q u i r e d " ) ;  
         } ) ;  
  
         / / # e n d r e g i o n  
  
         / / # r e g i o n   U t i l i t y   F u n c t i o n s  
         f u n c t i o n   i s V i e w M o d e l V a l i d ( )   {  
                 r e t u r n   t r u e ;  
         }  
  
         f u n c t i o n   g e t A c c o u n t V i e w M o d e l ( a c c o u n t )   {  
                 i f   ( ! a c c o u n t )  
                         r e t u r n ;  
  
                 v a r   a c c o u n t V i e w M o d e l ;  
  
                 A r r a y . f o r E a c h ( C o g n i t o . P a y m e n t . m o d e l . p a y m e n t S e t t i n g s . v i e w M o d e l . g e t _ P a y m e n t A c c o u n t s ( ) ,   f u n c t i o n   ( a )   {  
                         i f   ( a . g e t _ I d ( )   = = =   a c c o u n t . g e t _ I d ( ) )   {  
                                 a c c o u n t V i e w M o d e l   =   a ;  
                                 r e t u r n   f a l s e ;  
                         }  
                 } ) ;  
  
                 i f   ( ! a c c o u n t V i e w M o d e l )   {  
                         a c c o u n t V i e w M o d e l   =   n e w   C o g n i t o . P a y m e n t . P a y m e n t A c c o u n t V i e w M o d e l ( {  
                                 I d :   a c c o u n t . g e t _ I d ( ) ,  
                                 N a m e :   a c c o u n t . g e t _ N a m e ( ) ,  
                                 P r o c e s s o r N a m e :   a c c o u n t . g e t _ P r o c e s s o r N a m e ( ) ,  
                                 S t a t u s :   a c c o u n t . g e t _ S t a t u s ( ) ,  
                                 S t a t u s M e s s a g e :   a c c o u n t . g e t _ S t a t u s M e s s a g e ( ) ,  
                                 D e f a u l t C u r r e n c y :   a c c o u n t . g e t _ D e f a u l t C u r r e n c y ( ) ,  
 	 	 	 	 C a n I n c l u d e P r o c e s s i n g F e e s :   a c c o u n t . g e t _ C a n I n c l u d e P r o c e s s i n g F e e s ( ) ,  
 	 	 	 	 C a n S a v e S q u a r e C u s t o m e r C a r d :   a c c o u n t . g e t _ C a n S a v e S q u a r e C u s t o m e r C a r d ( )  
                         } ) ;  
                         C o g n i t o . P a y m e n t . m o d e l . p a y m e n t S e t t i n g s . v i e w M o d e l . g e t _ P a y m e n t A c c o u n t s ( ) . a d d ( a c c o u n t V i e w M o d e l ) ;  
                 }   e l s e   {  
                         a c c o u n t V i e w M o d e l . s e t _ N a m e ( a c c o u n t . g e t _ N a m e ( ) ) ;  
                         a c c o u n t V i e w M o d e l . s e t _ S t a t u s ( a c c o u n t . g e t _ S t a t u s ( ) ) ;  
                         a c c o u n t V i e w M o d e l . s e t _ S t a t u s M e s s a g e ( a c c o u n t . g e t _ S t a t u s M e s s a g e ( ) ) ;  
                         a c c o u n t V i e w M o d e l . s e t _ D e f a u l t C u r r e n c y ( a c c o u n t . g e t _ D e f a u l t C u r r e n c y ( ) ) ;  
 	 	 	 a c c o u n t V i e w M o d e l . s e t _ C a n I n c l u d e P r o c e s s i n g F e e s ( a c c o u n t . g e t _ C a n I n c l u d e P r o c e s s i n g F e e s ( ) ) ;  
 	 	 	 a c c o u n t V i e w M o d e l . s e t _ C a n S a v e S q u a r e C u s t o m e r C a r d ( a c c o u n t . g e t _ C a n S a v e S q u a r e C u s t o m e r C a r d ( ) ) ;  
                 }  
  
                 r e t u r n   a c c o u n t V i e w M o d e l ;  
         }  
  
         f u n c t i o n   s h o w P r o c e s s o r T e m p l a t e ( p r o c e s s o r N a m e ,   s e l e c t e d P r o c e s s o r )   {  
                 i f   ( s e l e c t e d P r o c e s s o r )   {  
                         r e t u r n   p r o c e s s o r N a m e   = = =   s e l e c t e d P r o c e s s o r . g e t _ N a m e ( ) ;  
                 }  
  
                 r e t u r n   f a l s e ;  
         }  
         C o g n i t o . P a y m e n t . s h o w P r o c e s s o r T e m p l a t e   =   s h o w P r o c e s s o r T e m p l a t e ;  
  
         f u n c t i o n   c o n n e c t P r o c e s s o r ( s e n d e r )   {  
                 $ ( w i n d o w ) . o f f ( " f o c u s . p a y p a l a u t h " ) ;  
                 $ ( w i n d o w ) . o f f ( " f o c u s . s t r i p e c o n n e c t " ) ;  
                 $ ( w i n d o w ) . o f f ( " f o c u s . s q u a r e c o n n e c t " ) ;  
  
                 v a r   p r o c e s s o r V i e w M o d e l   =   $ p a r e n t C o n t e x t D a t a ( s e n d e r ) ;  
  
                 i f   ( p r o c e s s o r V i e w M o d e l   & &   p r o c e s s o r V i e w M o d e l . g e t _ I s A v a i l a b l e ( ) )   {  
                         i f   ( p r o c e s s o r V i e w M o d e l . g e t _ N a m e ( )   = =   " P a y P a l " )   {  
                                 c o n n e c t P a y P a l ( p r o c e s s o r V i e w M o d e l ,   C o g n i t o . c o n f i g . p a y p a l S i g n U p S u p p o r t ) ;  
                         }  
                         e l s e   i f   ( p r o c e s s o r V i e w M o d e l . g e t _ N a m e ( )   = =   " S t r i p e " )   {  
                                 c o n n e c t S t r i p e ( p r o c e s s o r V i e w M o d e l ) ;  
                         }   e l s e   i f   ( p r o c e s s o r V i e w M o d e l . g e t _ N a m e ( )   = =   " S q u a r e " )   {  
                                 c o n n e c t S q u a r e ( p r o c e s s o r V i e w M o d e l ) ;  
                         }  
                 }  
         }  
         C o g n i t o . P a y m e n t . c o n n e c t P r o c e s s o r   =   c o n n e c t P r o c e s s o r ;  
  
         f u n c t i o n   c o n n e c t S q u a r e ( o b j )   {  
                 $ ( w i n d o w ) . o f f ( " f o c u s . s q u a r e c o n n e c t " ) ;  
  
                 C o g n i t o . P a y m e n t . m o d e l . p a y m e n t S e t t i n g s . v i e w M o d e l . s e t _ v a l i d a t i o n M e s s a g e ( " " ) ;  
                 v a r   a c c o u n t I d   =   " " ;  
  
                 i f   ( o b j . m e t a . t y p e . g e t _ f u l l N a m e ( )   = =   " C o g n i t o . P a y m e n t . P a y m e n t G a t e w a y " )   {  
                         a c c o u n t I d   =   o b j . g e t _ P a y m e n t A c c o u n t I d ( ) ;  
                 }  
  
                 v a r   u r l   =   C o g n i t o . c o n f i g . s q u a r e C o n n e c t U r l   +   " & s t a t e = "   +   C o g n i t o . P a y m e n t . m o d e l . p a y m e n t S e t t i n g s . v i e w M o d e l . g e t _ c u r r e n t G a t e w a y R e q u e s t I d ( ) ;  
                 C o g n i t o . P a y m e n t . p o s t G a t e w a y R e q u e s t ( C o g n i t o . P a y m e n t . m o d e l . p a y m e n t S e t t i n g s . v i e w M o d e l . g e t _ c u r r e n t G a t e w a y R e q u e s t I d ( ) ,   u r l ,   a c c o u n t I d ) ;  
  
                 w i n d o w . o p e n ( u r l ,   " _ b l a n k " ) ;  
  
                 C o g n i t o . P a y m e n t . S e t t i n g s W i z a r d . n a v i g a t e T o ( " C h e c k S t a t u s " ,   {   p r o c e s s o r :   " S q u a r e "   } ) ;  
  
                 / /   a t t a c h   t o   t h e   f o c u s   e v e n t  
                 $ ( w i n d o w ) . o n ( " f o c u s . s q u a r e c o n n e c t " ,   f u n c t i o n   ( )   {  
                         C o g n i t o . P a y m e n t . c h e c k G a t e w a y R e q u e s t S t a t u s ( f u n c t i o n   ( g a t e w a y R e q u e s t )   {  
                                 i f   ( g a t e w a y R e q u e s t )   {  
                                         / /   d e t a c h   f r o m   t h e   f o c u s   e v e n t  
                                         $ ( w i n d o w ) . o f f ( " f o c u s . s q u a r e c o n n e c t " ) ;  
                                         C o g n i t o . P a y m e n t . S e t t i n g s W i z a r d . n a v i g a t e T o ( " L o c a t i o n s " ,   {   d a t a :   g a t e w a y R e q u e s t   } ) ;  
                                 }  
                         } ,   f u n c t i o n   ( e r r o r ,   m e s s a g e )   {  
  
                                 / /   d e t a c h   f r o m   t h e   f o c u s   e v e n t  
                                 $ ( w i n d o w ) . o f f ( " f o c u s . s q u a r e c o n n e c t " ) ;  
                                 C o g n i t o . P a y m e n t . m o d e l . p a y m e n t S e t t i n g s . v i e w M o d e l . s e t _ v a l i d a t i o n M e s s a g e ( m s g ) ;  
                                 $ ( " . c - p a y m e n t - s e t t i n g s - e r r o r " ) . s h o w ( ) ;  
  
                         } ) ;  
                 } ) ;  
         }  
  
         f u n c t i o n   c o n n e c t S t r i p e ( o b j )   {  
                 $ ( w i n d o w ) . o f f ( " f o c u s . s t r i p e c o n n e c t " ) ;  
  
                 C o g n i t o . P a y m e n t . m o d e l . p a y m e n t S e t t i n g s . v i e w M o d e l . s e t _ v a l i d a t i o n M e s s a g e ( " " ) ;  
                 v a r   a c c o u n t I d   =   " " ;  
  
                 i f   ( o b j . m e t a . t y p e . g e t _ f u l l N a m e ( )   = =   " C o g n i t o . P a y m e n t . P a y m e n t G a t e w a y " )   {  
                         a c c o u n t I d   =   o b j . g e t _ P a y m e n t A c c o u n t I d ( ) ;  
                 }  
  
                 v a r   u r l   =   C o g n i t o . c o n f i g . s t r i p e C o n n e c t U r l   +   " & s t a t e = "   +   C o g n i t o . P a y m e n t . m o d e l . p a y m e n t S e t t i n g s . v i e w M o d e l . g e t _ c u r r e n t G a t e w a y R e q u e s t I d ( ) ;  
  
                 / /   u p d a t e   t h e   g a t e w a y   r e q u e s t   o b j e c t  
                 C o g n i t o . P a y m e n t . p o s t G a t e w a y R e q u e s t ( C o g n i t o . P a y m e n t . m o d e l . p a y m e n t S e t t i n g s . v i e w M o d e l . g e t _ c u r r e n t G a t e w a y R e q u e s t I d ( ) ,   u r l ,   a c c o u n t I d ) ;  
  
                 w i n d o w . o p e n ( u r l ,   " n e w w i n d o w " ) ;  
  
                 C o g n i t o . P a y m e n t . S e t t i n g s W i z a r d . n a v i g a t e T o ( " C h e c k S t a t u s " ,   {   p r o c e s s o r :   " S t r i p e "   } ) ;  
  
                 / /   a t t a c h   t o   t h e   f o c u s   e v e n t  
                 $ ( w i n d o w ) . o n ( " f o c u s . s t r i p e c o n n e c t " ,   f u n c t i o n   ( )   {  
                         C o g n i t o . P a y m e n t . c h e c k G a t e w a y R e q u e s t S t a t u s ( f u n c t i o n   ( g a t e w a y R e q u e s t )   {  
                                 i f   ( g a t e w a y R e q u e s t )   {  
                                         / /   d e t a c h   f r o m   t h e   f o c u s   e v e n t  
                                         $ ( w i n d o w ) . o f f ( " f o c u s . s t r i p e c o n n e c t " ) ;  
                                         C o g n i t o . P a y m e n t . S e t t i n g s W i z a r d . n a v i g a t e T o ( " C o n n e c t e d T o P r o c e s s o r " ,   {   d a t a :   g a t e w a y R e q u e s t   } ) ;  
                                 }  
                         } ,   f u n c t i o n   ( e r r o r ,   m e s s a g e )   {  
  
                                 / /   d e t a c h   f r o m   t h e   f o c u s   e v e n t  
                                 $ ( w i n d o w ) . o f f ( " f o c u s . s t r i p e c o n n e c t " ) ;  
                                 C o g n i t o . P a y m e n t . m o d e l . p a y m e n t S e t t i n g s . v i e w M o d e l . s e t _ v a l i d a t i o n M e s s a g e ( m s g ) ;  
                                 $ ( " . c - p a y m e n t - s e t t i n g s - e r r o r " ) . s h o w ( ) ;  
  
                         } ) ;  
                 } ) ;  
         }  
  
         f u n c t i o n   c o n n e c t P a y P a l ( o b j ,   u s e S i g n U p )   {  
  
                 i f   ( ! C o g n i t o . c o n f i g . a l l o w P a y P a l )  
                         r e t u r n ;  
  
                 C o g n i t o . P a y m e n t . m o d e l . p a y m e n t S e t t i n g s . v i e w M o d e l . s e t _ v a l i d a t i o n M e s s a g e ( " " ) ;  
  
                 v a r   a c c o u n t I d   =   " " ;  
  
                 i f   ( o b j   & &   o b j . m e t a . t y p e . g e t _ f u l l N a m e ( )   = =   " C o g n i t o . P a y m e n t . P a y m e n t G a t e w a y " )   {  
                         a c c o u n t I d   =   o b j . g e t _ P a y m e n t A c c o u n t I d ( ) ;  
                 }  
  
                 i f   ( u s e S i g n U p )   {  
                         h a n d l e P a y P a l S i g n U p ( a c c o u n t I d ,   t r u e ) ;  
                 }   e l s e   {  
                         C o g n i t o . P a y m e n t . S e t t i n g s W i z a r d . n a v i g a t e T o ( " A c c o u n t S e t u p " ,   {   p r o c e s s o r N a m e :   " P a y P a l "   } ) ;  
  
                         $ ( " . c - p a y m e n t - a c c o u n t - i n s t r u c t i o n s " ) . h t m l ( " < h 2 > T o   c o n n e c t   y o u r   P a y P a l   a c c o u n t ,   p l e a s e   e n t e r   t h e   e m a i l   a d d r e s s   a s s o c i a t e d   w i t h   y o u r   a c c o u n t . < / h 2 > " ) ;  
                 }  
         }  
         C o g n i t o . P a y m e n t . c o n n e c t P a y P a l   =   c o n n e c t P a y P a l ;  
  
         f u n c t i o n   h a n d l e P a y P a l S i g n U p ( a c c o u n t I d ,   c h e c k S t a t u s )   {  
  
                 $ ( w i n d o w ) . o f f ( " f o c u s . p a y p a l a u t h " ) ;  
  
                 v a r   u r l   =   C o g n i t o . c o n f i g . p a y p a l C o n n e c t U r l   +   " & m e r c h a n t I d = "   +   C o g n i t o . P a y m e n t . m o d e l . p a y m e n t S e t t i n g s . v i e w M o d e l . g e t _ c u r r e n t G a t e w a y R e q u e s t I d ( ) ;  
  
                 / /   u p d a t e   t h e   g a t e w a y   r e q u e s t   o b j e c t  
                 C o g n i t o . P a y m e n t . p o s t G a t e w a y R e q u e s t ( C o g n i t o . P a y m e n t . m o d e l . p a y m e n t S e t t i n g s . v i e w M o d e l . g e t _ c u r r e n t G a t e w a y R e q u e s t I d ( ) ,   u r l ,   a c c o u n t I d ) ;  
  
                 w i n d o w . o p e n ( u r l ,   " n e w w i n d o w " ) ;  
  
                 i f   ( c h e c k S t a t u s )   {  
                         C o g n i t o . P a y m e n t . S e t t i n g s W i z a r d . n a v i g a t e T o ( " C h e c k S t a t u s " ,   {   p r o c e s s o r :   " P a y P a l "   } ) ;  
                 }  
  
                 / /   a t t a c h   t o   t h e   f o c u s   e v e n t  
                 $ ( w i n d o w ) . o n ( " f o c u s . p a y p a l a u t h " ,   f u n c t i o n   ( )   {  
                         C o g n i t o . P a y m e n t . c h e c k G a t e w a y R e q u e s t S t a t u s ( f u n c t i o n   ( g a t e w a y R e q u e s t )   {  
                                 i f   ( g a t e w a y R e q u e s t )   {  
                                         / /   d e t a c h   f r o m   t h e   f o c u s   e v e n t  
                                         $ ( w i n d o w ) . o f f ( " f o c u s . p a y p a l a u t h " ) ;  
                                         C o g n i t o . P a y m e n t . S e t t i n g s W i z a r d . n a v i g a t e T o ( " C o n n e c t e d T o P r o c e s s o r " ,   {   d a t a :   g a t e w a y R e q u e s t   } ) ;  
                                 }   e l s e   {  
                                         $ ( " . c - p a y m e n t - s e t t i n g s - s i g n i n - i n s t r u c t i o n s " ) . h t m l ( " C l i c k   < a   o n c l i c k = \ " C o g n i t o . P a y m e n t . c o n n e c t P a y P a l ( n u l l ,   f a l s e ) \ " > h e r e < / a >   t o   m a n u a l l y   e n t e r   y o u r   P a y P a l   e m a i l   a d d r e s s . " ) ;  
                                 }  
                         } ,   f u n c t i o n   ( e r r o r ,   m e s s a g e )   {  
                                 / /   d e t a c h   f r o m   t h e   f o c u s   e v e n t  
                                 $ ( w i n d o w ) . o f f ( " f o c u s . p a y p a l a u t h " ) ;  
                                 C o g n i t o . P a y m e n t . m o d e l . p a y m e n t S e t t i n g s . v i e w M o d e l . s e t _ v a l i d a t i o n M e s s a g e ( m s g ) ;  
                                 $ ( " . c - p a y m e n t - s e t t i n g s - e r r o r " ) . s h o w ( ) ;  
                         } ) ;  
                 } ) ;  
         }  
         C o g n i t o . P a y m e n t . h a n d l e P a y P a l S i g n U p   =   h a n d l e P a y P a l S i g n U p ;  
  
         f u n c t i o n   s e t t i n g s D i a l o g C o m p l e t e ( d i a l o g ,   c a l l b a c k )   {  
 	 	 $ ( w i n d o w ) . o f f ( " f o c u s . s t r i p e c o n n e c t " ) ;  
 	 	 C o g n i t o . P a y m e n t . S e t t i n g s W i z a r d . c u r r e n t S t e p . e x e c u t e ( d i a l o g ,   n u l l ,   c a l l b a c k ) ;  
         }  
         C o g n i t o . P a y m e n t . s e t t i n g s D i a l o g C o m p l e t e   =   s e t t i n g s D i a l o g C o m p l e t e ;  
  
         f u n c t i o n   s e t t i n g s D i a l o g C a n c e l ( d i a l o g ,   c a l l b a c k )   {  
                 $ ( w i n d o w ) . o f f ( " f o c u s . s t r i p e c o n n e c t " ) ;  
                 C o g n i t o . P a y m e n t . S e t t i n g s W i z a r d . c u r r e n t S t e p . c a n c e l ( d i a l o g ,   n u l l ,   c a l l b a c k ) ;  
         }  
         C o g n i t o . P a y m e n t . s e t t i n g s D i a l o g C a n c e l   =   s e t t i n g s D i a l o g C a n c e l ;  
  
         f u n c t i o n   f i n a l i z e E d i t A c c o u n t S t e p ( p a y m e n t A c c o u n t )   {  
                 C o g n i t o . P a y m e n t . m o d e l . p a y m e n t S e t t i n g s . v i e w M o d e l . s e t _ s h o w E x i s t i n g A c c o u n t s ( f a l s e ) ;  
                 C o g n i t o . P a y m e n t . m o d e l . p a y m e n t S e t t i n g s . v i e w M o d e l . s e t _ s h o w P r o c e s s o r T y p e s ( f a l s e ) ;  
                 C o g n i t o . P a y m e n t . m o d e l . p a y m e n t S e t t i n g s . v i e w M o d e l . s e t _ s h o w C h e c k i n g S i g n I n S t a t u s ( f a l s e ) ;  
                 C o g n i t o . P a y m e n t . m o d e l . p a y m e n t S e t t i n g s . v i e w M o d e l . s e t _ c u r r e n t A c c o u n t ( p a y m e n t A c c o u n t ) ;  
                 C o g n i t o . P a y m e n t . m o d e l . p a y m e n t S e t t i n g s . v i e w M o d e l . g e t _ c u r r e n t A c c o u n t ( ) . g e t _ G a t e w a y ( ) . s e t _ P a y m e n t A c c o u n t I d ( p a y m e n t A c c o u n t . g e t _ I d ( ) ) ;  
                 C o g n i t o . P a y m e n t . m o d e l . p a y m e n t S e t t i n g s . v i e w M o d e l . g e t _ c u r r e n t A c c o u n t ( ) . s e t _ S h o w R e m o v e A c c o u n t ( f a l s e ) ;  
  
                 i f   ( C o g n i t o . P a y m e n t . m o d e l . p a y m e n t S e t t i n g s . v i e w M o d e l . g e t _ c u r r e n t A c c o u n t ( ) . g e t _ P r o c e s s o r N a m e ( )   = = =   " S t r i p e " )   {  
                         $ ( " . c - w e b - s t r i p e - r e f r e s h " ) . s h o w ( ) ;  
                 }  
                 $ ( " . c - p a y m e n t - g a t e w a y - e d i t o r " ) . s h o w ( ) ;  
  
                 p a y m e n t S e t t i n g s D i a l o g . _ d i a l o g . f i n d ( " . c - m o d a l - b u t t o n : l a s t " ) . t e x t ( " D o n e " ) . s h o w ( ) ;  
                 p a y m e n t S e t t i n g s D i a l o g . _ d i a l o g . f i n d ( " . c - m o d a l - b u t t o n : f i r s t " ) . t e x t ( " C a n c e l " ) . s h o w ( ) ;  
         }  
         / / # e n d r e g i o n  
  
         / / # r e g i o n   R e q u e s t s  
  
         C o g n i t o . o p e n P a y m e n t S e t t i n g s   =   f u n c t i o n   C o g n i t o $ o p e n P a y m e n t S e t t i n g s ( a c c o u n t R e f ,   s a v e C a l l b a c k ,   c a n c e l C a l l b a c k ,   a c c o u n t R e m o v e d C a l l b a c k )   {  
  
                 d i a l o g S a v e C a l l b a c k   =   s a v e C a l l b a c k ;  
                 d i a l o g C a n c e l C a l l b a c k   =   c a n c e l C a l l b a c k ;  
                 d i a l o g A c c o u n t R e m o v e d C a l l b a c k   =   a c c o u n t R e m o v e d C a l l b a c k ;  
  
                 c r e a t e P a y m e n t S e t t i n g s V i e w M o d e l ( f u n c t i o n   ( p a y m e n t S e t t i n g s )   {  
  
                         / /   i f   t h e   p a y m e n t   s e t t i n g s   p a r a m   i s   n u l l ,   t h e n   n o   c a l l   w a s   m a d e   t o   t h e   s e r v e r ,  
                         / /   j u s t   u s e   t h e   d a t a   a v a i l a b l e   a l r e a d y   o n   t h e   c l i e n t  
                         i f   ( p a y m e n t S e t t i n g s )   {  
  
                                 / /   M a k e   t h e   v i e w M o d e l   o b j e c t   a   C o g n i t o   m o d e l  
                                 p a y m e n t S e t t i n g s . v i e w M o d e l   =   C o g n i t o . d e s e r i a l i z e ( C o g n i t o . P a y m e n t . P a y m e n t C o n f i g u r a t i o n V i e w M o d e l ,   p a y m e n t S e t t i n g s . v i e w M o d e l ) ;  
  
                                 A r r a y . f o r E a c h ( p a y m e n t S e t t i n g s . v i e w M o d e l . g e t _ P r o c e s s o r s ( ) ,   f u n c t i o n   ( m o d e l )   {  
                                         v a r   p r o c e s s o r   =   C o g n i t o . g e t E n u m W i t h N a m e ( C o g n i t o . P a y m e n t . P a y m e n t P r o c e s s o r ,   m o d e l . g e t _ N a m e ( ) ) ;  
                                 } ) ;  
  
                                 / /   R a i s e   c h a n g e s  
                                 E x o W e b . O b s e r v e r . s e t V a l u e ( m o d u l e . m o d e l ,   " p a y m e n t S e t t i n g s " ,   p a y m e n t S e t t i n g s ) ;  
  
                                 / /   M a k e   v i e w   m o d e l   o b s e r v a b l e  
                                 E x o W e b . O b s e r v e r . m a k e O b s e r v a b l e ( C o g n i t o . P a y m e n t . m o d e l . p a y m e n t S e t t i n g s ) ;  
  
                                 / /   D i s a b l e   P a y P a l   i f   f e a t u r e   n o t   a v a i l a b l e  
                                 i f   ( ! C o g n i t o . c o n f i g . a l l o w P a y P a l )   {  
                                         E x o J Q u e r y ( " . c - w e b - p a y p a l - l o g i n " ) . h i d e ( ) ;  
                                         E x o J Q u e r y ( " . c - w e b - p a y p a l - n o t - a v a i l a b l e " ) . s h o w ( ) ;  
                                 }  
                         }  
  
                         / /   s e t   t h e   e x i s t i n g   a c c o u n t   b a s e d   o n   t h e   a c c o u n t   r e f   p a s s e d   i n  
                         i f   ( a c c o u n t R e f )   {  
                                 A r r a y . f o r E a c h ( C o g n i t o . P a y m e n t . m o d e l . p a y m e n t S e t t i n g s . v i e w M o d e l . g e t _ P a y m e n t A c c o u n t s ( ) ,   f u n c t i o n   ( a c c o u n t )   {  
                                         i f   ( a c c o u n t . g e t _ I d ( )   = = =   a c c o u n t R e f . g e t _ I d ( ) )   {  
                                                 C o g n i t o . P a y m e n t . m o d e l . p a y m e n t S e t t i n g s . v i e w M o d e l . s e t _ e x i s t i n g A c c o u n t ( a c c o u n t ) ;  
                                         }  
                                 } ) ;  
                         }  
  
                         / /   s e t u p   t h e   d i a l o g 	 	 	  
                         C o g n i t o . P a y m e n t . m o d e l . p a y m e n t S e t t i n g s . v i e w M o d e l . s e t _ c u r r e n t A c c o u n t ( n u l l ) ;  
                         C o g n i t o . P a y m e n t . m o d e l . p a y m e n t S e t t i n g s . v i e w M o d e l . s e t _ v a l i d a t i o n M e s s a g e ( " " ) ;  
  
                         / /   s e t u p   t h e   w i z a r d   s e t p s  
                         s e t u p P a y m e n t S e t t i n g s W i z a r d ( ) ;  
  
                         / /   n a v i g a t e   t o   t h e   f i r s t   s t e p   o f   t h e   w i z a r d  
                         i f   ( C o g n i t o . P a y m e n t . m o d e l . p a y m e n t S e t t i n g s . v i e w M o d e l . g e t _ P a y m e n t A c c o u n t s ( ) . l e n g t h   >   0 )   {  
                                 C o g n i t o . P a y m e n t . S e t t i n g s W i z a r d . n a v i g a t e T o ( " E x i s t i n g A c c o u n t s " ) ;  
                         }   e l s e   {  
                                 C o g n i t o . P a y m e n t . S e t t i n g s W i z a r d . n a v i g a t e T o ( " S e l e c t P r o c e s s o r " ) ;  
                         }  
  
                         / /   O p e n   d i a l o g  
                         p a y m e n t S e t t i n g s D i a l o g . _ d i a l o g . a d d C l a s s ( " c - p a y m e n t - a c c o u n t - d i a l o g " ) ;  
                         p a y m e n t S e t t i n g s D i a l o g . _ d i a l o g . f i n d ( " . c - m o d a l - t i t l e " ) . t e x t ( " P a y m e n t   A c c o u n t s " ) ;  
                         p a y m e n t S e t t i n g s D i a l o g . o p e n ( ) ;  
                 } ) ;  
         } ;  
  
         / /   C r e a t e s   a   v i e w   m o d e l   b a s e d   o n   a   s t r i n g   e x p r e s s i o n   a n d   t y p e   m e t a .  
         f u n c t i o n   c r e a t e P a y m e n t S e t t i n g s V i e w M o d e l ( c a l l b a c k )   {  
                 i f   ( ! C o g n i t o . P a y m e n t . m o d e l . p a y m e n t S e t t i n g s . v i e w M o d e l )   {  
                         m o d u l e . s e r v i c e R e q u e s t ( {  
                                 d a t a T y p e :   " j s o n " ,  
                                 e n d p o i n t :   " C r e a t e P a y m e n t S e t t i n g s V i e w M o d e l " ,  
                                 m e t h o d :   " P O S T " ,  
                                 s u c c e s s :   f u n c t i o n   ( d a t a )   {  
                                         c a l l b a c k ( d a t a ) ;  
                                 }  
                         } ) ;  
                 }   e l s e   {  
                         c a l l b a c k ( n u l l ) ;  
                 }  
         } ;  
  
         / /   l o a d   p a y m e n t   a c c o u n t   f r o m   t h e   s e r v e r  
         f u n c t i o n   l o a d P a y m e n t A c c o u n t ( a c c o u n t I d ,   p r o c e s s o r N a m e ,   s u c c e s s C a l l b a c k ,   f a i l u r e C a l l b a c k )   {  
                 i f   ( a c c o u n t I d )   {  
                         / /   l o a d   t h e   f u l l   p a y m e n t   a c c o u n t   f o r   e d i t i n g  
                         m o d u l e . s e r v i c e R e q u e s t ( {  
                                 d a t a T y p e :   " j s o n " ,  
                                 e n d p o i n t :   " P a y m e n t A c c o u n t " ,  
                                 m e t h o d :   " G E T " ,  
                                 d a t a :   {   a c c o u n t I d :   a c c o u n t I d   } ,  
                                 s u c c e s s :   s u c c e s s C a l l b a c k ,  
                                 e r r o r :   f a i l u r e C a l l b a c k  
                         } ) ;  
                 }   e l s e   {  
                         v a r   p a y m e n t A c c o u n t   =   n e w   C o g n i t o . P a y m e n t . P a y m e n t A c c o u n t ( {  
                                 I s A c t i v e :   t r u e ,  
                                 C o u n t r y :   C o g n i t o . c o n f i g . d e f a u l t L o c a l i z a t i o n . g e t _ C o u n t r y ( ) ,  
                                 D e f a u l t C u r r e n c y :   C o g n i t o . c o n f i g . d e f a u l t L o c a l i z a t i o n . g e t _ C u r r e n c y ( ) ,  
                                 P a y m e n t P r o c e s s o r :   C o g n i t o . g e t E n u m W i t h N a m e ( C o g n i t o . P a y m e n t . P a y m e n t P r o c e s s o r ,   a r g s . p r o c e s s o r N a m e ) ,  
                                 P r o c e s s o r N a m e :   a r g s . p r o c e s s o r N a m e ,  
                                 G a t e w a y :   n e w   C o g n i t o . P a y m e n t . P a y m e n t G a t e w a y ( {   P r o c e s s o r :   C o g n i t o . g e t E n u m W i t h N a m e ( C o g n i t o . P a y m e n t . P a y m e n t P r o c e s s o r ,   a r g s . p r o c e s s o r N a m e )   } )  
                         } ) ;  
  
                         s u c c e s s C a l l b a c k ( p a y m e n t A c c o u n t ) ;  
                 }  
         }  
  
         f u n c t i o n   g e t M e r c h a n t ( p a y m e n t A c c o u n t I d ,   s u c c e s s ,   e r r o r )   {  
                 C o g n i t o . s e r v i c e R e q u e s t ( {  
                         d a t a T y p e :   " j s o n " ,  
                         e n d p o i n t :   " m e r c h a n t " ,  
                         m e t h o d :   " G E T " ,  
                         d a t a :   {   i d :   p a y m e n t A c c o u n t I d   } ,  
                         m o d u l e :   " p a y m e n t " ,  
                         s u c c e s s :   f u n c t i o n   ( d a t a )   {  
                                 v a r   m e r c h a n t   =   C o g n i t o . d e s e r i a l i z e ( C o g n i t o . P a y m e n t . P a y m e n t M e r c h a n t ,   d a t a ) ;  
  
                                 i f   ( s u c c e s s   & &   s u c c e s s   i n s t a n c e o f   F u n c t i o n )   {  
                                         s u c c e s s ( m e r c h a n t ) ;  
                                 }  
                         } ,  
                         e r r o r :   f u n c t i o n   ( d a t a ,   m s g )   {  
                                 i f   ( e r r o r   & &   e r r o r   i n s t a n c e o f   F u n c t i o n )   {  
                                         e r r o r ( d a t a ) ;  
                                 }  
                         }  
                 } ) ;  
         }  
         C o g n i t o . P a y m e n t . g e t M e r c h a n t   =   g e t M e r c h a n t ;  
  
         f u n c t i o n   c h e c k G a t e w a y R e q u e s t S t a t u s ( s u c c e s s ,   e r r o r )   {  
  
                 i f   ( C o g n i t o . P a y m e n t . m o d e l . p a y m e n t S e t t i n g s . v i e w M o d e l . g e t _ c u r r e n t G a t e w a y R e q u e s t I d ( ) )   {  
  
                         / /   m a k e   s e r v i c e   c a l l   t o   c h e c k   s t a t u s   o f   t h e   g a t e w a y   r e q u e s t  
                         C o g n i t o . s e r v i c e R e q u e s t ( {  
                                 d a t a T y p e :   " j s o n " ,  
                                 e n d p o i n t :   " G a t e w a y R e q u e s t " ,  
                                 m e t h o d :   " G E T " ,  
                                 d a t a :   {   i d :   C o g n i t o . P a y m e n t . m o d e l . p a y m e n t S e t t i n g s . v i e w M o d e l . g e t _ c u r r e n t G a t e w a y R e q u e s t I d ( )   } ,  
                                 m o d u l e :   " p a y m e n t " ,  
                                 s u c c e s s :   f u n c t i o n   ( d a t a )   {  
                                         i f   ( d a t a   & &   d a t a . R e s p o n s e S t a t u s )   {  
  
                                                 i f   ( d a t a . R e s p o n s e S t a t u s   = =   2 0 0 )   {  
                                                         / /   d e s e r i a l i z e   t h e   g a t e w a y   r e q u e s e t   v i e w   m o d e l   ( c o n t a i n i n g   t h e   f u l l   p a y m e n t   a c c o u n t )  
                                                         v a r   g a t e w a y R e q u e s t   =   C o g n i t o . d e s e r i a l i z e ( C o g n i t o . P a y m e n t . P a y m e n t G a t e w a y R e q u e s t V i e w M o d e l ,   d a t a ) ;  
  
                                                         / /   m a k e   s u r e   t h e   p a y m e n t   a c c o u n t   o n   t h e   c l i e n t   i s   f u l l y   u p d a t e d   w i t h   t h e   r e s p o n s e   f r o m   t h e   s e r v e r .  
                                                         g a t e w a y R e q u e s t . g e t _ P a y m e n t A c c o u n t ( ) . s e t _ S t a t u s ( C o g n i t o . g e t E n u m W i t h N a m e ( C o g n i t o . P a y m e n t . P a y m e n t A c c o u n t S t a t u s ,   d a t a . P a y m e n t A c c o u n t . S t a t u s ) ) ;  
                                                         g a t e w a y R e q u e s t . g e t _ P a y m e n t A c c o u n t ( ) . s e t _ S t a t u s M e s s a g e ( d a t a . P a y m e n t A c c o u n t . S t a t u s M e s s a g e ) ;  
                                                         g a t e w a y R e q u e s t . g e t _ P a y m e n t A c c o u n t ( ) . s e t _ N a m e ( d a t a . P a y m e n t A c c o u n t . N a m e ) ;  
                                                         g a t e w a y R e q u e s t . g e t _ P a y m e n t A c c o u n t ( ) . s e t _ D e f a u l t C u r r e n c y ( C o g n i t o . d e s e r i a l i z e ( C o g n i t o . C u r r e n c y ,   d a t a . P a y m e n t A c c o u n t . D e f a u l t C u r r e n c y ) ) ;  
  
                                                         / /   g e t   v i e w   m o d e l   t o   e n s u r e   t h a t   t h e   a c c o u n t   i s   p r o p e r l y   a d d e d   t o   t h e   c l i e n t   l i s t  
                                                         v a r   v i e w M o d e l   =   g e t A c c o u n t V i e w M o d e l ( g a t e w a y R e q u e s t . g e t _ P a y m e n t A c c o u n t ( ) ) ;  
  
                                                         i f   ( s u c c e s s   & &   s u c c e s s   i n s t a n c e o f   F u n c t i o n )   {  
                                                                 s u c c e s s ( g a t e w a y R e q u e s t ) ;  
                                                         }  
                                                 }   e l s e   {  
                                                         C o g n i t o . P a y m e n t . m o d e l . p a y m e n t S e t t i n g s . v i e w M o d e l . s e t _ v a l i d a t i o n M e s s a g e ( d a t a . R e s p o n s e M e s s a g e ) ;  
                                                         $ ( " . c - p a y m e n t - s e t t i n g s - e r r o r " ) . s h o w ( ) ;  
                                                 }  
                                         }   e l s e   i f   ( s u c c e s s   & &   s u c c e s s   i n s t a n c e o f   F u n c t i o n )   {  
                                                 s u c c e s s ( ) ;  
                                         }  
                                 } ,  
                                 e r r o r :   f u n c t i o n   ( d a t a ,   m s g )   {  
                                         i f   ( e r r o r   & &   e r r o r   i n s t a n c e o f   F u n c t i o n )   {  
                                                 e r r o r ( d a t a ,   m s g ) ;  
                                         }  
                                 }  
                         } ) ;  
                 }  
         }  
         C o g n i t o . P a y m e n t . c h e c k G a t e w a y R e q u e s t S t a t u s   =   c h e c k G a t e w a y R e q u e s t S t a t u s ;  
  
         f u n c t i o n   p o s t G a t e w a y R e q u e s t ( r e q u e s t I d ,   r e q u e s t U r l ,   a c c o u n t I d ,   s u c c e s s )   {  
  
                 / /   c r e a t e   a   g a t e w a y   r e q u e s t   o b j e c t ,   i n   p r e p a r a t i o n   f o r   a   c a l l   o u t   t o   3 r d   p a r t y    
                 / /   p a y m e n t   g a t e w a y  
                 C o g n i t o . s e r v i c e R e q u e s t ( {  
                         e n d p o i n t :   " G a t e w a y R e q u e s t " ,  
                         m e t h o d :   " P O S T " ,  
                         d a t a :   {   r e q u e s t I d :   r e q u e s t I d ,   r e q u e s t U r l :   r e q u e s t U r l ,   a c c o u n t I d :   a c c o u n t I d   } ,  
                         m o d u l e :   " p a y m e n t " ,  
                         s u c c e s s :   f u n c t i o n   ( d a t a )   {  
                                 C o g n i t o . P a y m e n t . m o d e l . p a y m e n t S e t t i n g s . v i e w M o d e l . s e t _ c u r r e n t G a t e w a y R e q u e s t I d ( d a t a . I d ) ;  
  
                                 i f   ( s u c c e s s   & &   s u c c e s s   i n s t a n c e o f   F u n c t i o n )   {  
                                         s u c c e s s ( d a t a ) ;  
                                 }  
                         } ,  
                         e r r o r :   f u n c t i o n   ( d a t a ,   m s g )   {  
                                 C o g n i t o . P a y m e n t . m o d e l . p a y m e n t S e t t i n g s . v i e w M o d e l . s e t _ c u r r e n t G a t e w a y R e q u e s t I d ( n u l l ) ;  
                         }  
                 } ) ;  
         }  
         C o g n i t o . P a y m e n t . p o s t G a t e w a y R e q u e s t   =   p o s t G a t e w a y R e q u e s t ;  
  
         f u n c t i o n   r e f r e s h S t r i p e ( )   {  
                 C o g n i t o . s e r v i c e R e q u e s t ( {  
                         d a t a T y p e :   " j s o n " ,  
                         e n d p o i n t :   " S t r i p e / R e f r e s h " ,  
                         m e t h o d :   " P O S T " ,  
                         d a t a :   {   o r g a n i z a t i o n :   C o g n i t o . c o n f i g . o r g a n i z a t i o n C o d e ,   p a y A c c o u n t I d :   C o g n i t o . P a y m e n t . m o d e l . p a y m e n t S e t t i n g s . v i e w M o d e l . g e t _ c u r r e n t A c c o u n t ( ) . g e t _ I d ( )   } ,  
                         s u c c e s s :   f u n c t i o n   ( d a t a )   {  
                                 i f   ( d a t a . S u c c e s s )   {  
                                         $ ( " . c - p a y m e n t - a c c o u n t - s t r i p e - r e f r e s h - o k " ) . s h o w ( ) ;  
                                 }   e l s e   {  
                                         C o g n i t o . P a y m e n t . m o d e l . p a y m e n t S e t t i n g s . v i e w M o d e l . s e t _ v a l i d a t i o n M e s s a g e ( d a t a . E r r o r M e s s a g e ) ;  
                                         $ ( " . c - p a y m e n t - s e t t i n g s - e r r o r " ) . s h o w ( ) ;  
                                 }  
                         } ,  
                         e r r o r :   f u n c t i o n   ( d a t a ,   m s g )   {  
                                 C o g n i t o . P a y m e n t . m o d e l . p a y m e n t S e t t i n g s . v i e w M o d e l . s e t _ v a l i d a t i o n M e s s a g e ( m s g ) ;  
                                 $ ( " . c - p a y m e n t - s e t t i n g s - e r r o r " ) . s h o w ( ) ;  
                         }  
                 } ) ;  
         }  
         C o g n i t o . P a y m e n t . r e f r e s h S t r i p e   =   r e f r e s h S t r i p e ;  
  
         f u n c t i o n   h a s E r r o r s ( )   {  
                 v a r   e r r o r s   =   $ ( ' . c - p a y m e n t - g a t e w a y - e d i t o r ' ) . f i n d ( ' . c - v a l i d a t i o n : n o t ( : e m p t y ) ' ) . n o t ( ' : h i d d e n , . c - w a r n i n g ' ) . f i l t e r ( f u n c t i o n   ( )   {   r e t u r n   $ ( t h i s ) . t e x t ( )   ! = =   ' ' ;   } ) . f i r s t ( ) ;  
                 r e t u r n   e r r o r s   & &   e r r o r s . l e n g t h   >   0   ?   e r r o r s   :   n u l l ;  
         }  
         / / # e n d r e g i o n  
  
         $ ( d o c u m e n t )  
                 . o n ( " c l i c k " ,   " i n p u t [ t y p e = c h e c k b o x ] . c - p a y m e n t - a c c o u n t - r e f s " ,   f u n c t i o n   ( )   {  
                         i f   ( $ ( t h i s ) . a t t r ( " c h e c k e d " ) )   {  
                                 / /   s e t   t h e   c h e c k b o x e s   c o r r e c t l y  
                                 $ ( " i n p u t [ t y p e = c h e c k b o x ] . c - p a y m e n t - a c c o u n t - r e f s : v i s i b l e : c h e c k e d " ) . a t t r ( " c h e c k e d " ,   f a l s e ) ;  
                                 $ ( t h i s ) . a t t r ( " c h e c k e d " ,   t r u e ) ;  
  
                                 / /   s e t   t h e   e x i s t i n g   a c c o u n t   r e f   p r o p e r t y  
                                 v a r   s e l e c t e d A c c o u n t   =   $ p a r e n t C o n t e x t D a t a ( t h i s ) . g e t _ r a w V a l u e ( ) ;  
                                 C o g n i t o . P a y m e n t . m o d e l . p a y m e n t S e t t i n g s . v i e w M o d e l . s e t _ e x i s t i n g A c c o u n t ( s e l e c t e d A c c o u n t ) ;  
                         }   e l s e   {  
                                 C o g n i t o . P a y m e n t . m o d e l . p a y m e n t S e t t i n g s . v i e w M o d e l . s e t _ e x i s t i n g A c c o u n t ( n u l l ) ;  
                         }  
                 } )  
                 . o n ( " c l i c k " ,   " . c - p a y m e n t - s e t t i n g s - a c c o u n t - e d i t " ,   f u n c t i o n   ( e l )   {  
                         v a r   s e l e c t e d R e f   =   $ p a r e n t C o n t e x t D a t a ( t h i s ) . g e t _ r a w V a l u e ( ) ;  
  
                         C o g n i t o . P a y m e n t . p o s t G a t e w a y R e q u e s t ( n u l l ,   " " ,   s e l e c t e d R e f . g e t _ I d ( ) ,   f u n c t i o n   ( )   {  
                                 C o g n i t o . P a y m e n t . S e t t i n g s W i z a r d . n a v i g a t e T o ( " E d i t A c c o u n t " ,   s e l e c t e d R e f ) ;  
                         } ) ;  
                 } )  
                 . o n ( " c l i c k " ,   " . c - p a y m e n t - s e t t i n g s - a c c o u n t - r e m o v e " ,   f u n c t i o n   ( e l )   {  
                         v a r   s e l e c t e d R e f   =   $ p a r e n t C o n t e x t D a t a ( t h i s ) . g e t _ r a w V a l u e ( ) ;  
                         C o g n i t o . P a y m e n t . S e t t i n g s W i z a r d . n a v i g a t e T o ( " R e m o v e A c c o u n t " ,   s e l e c t e d R e f ) ;  
  
                 } )  
                 . o n ( " c l i c k " ,   " . c - p a y m e n t - s e t t i n g s - a c c o u n t - a d d " ,   f u n c t i o n   ( )   {  
                         C o g n i t o . P a y m e n t . S e t t i n g s W i z a r d . n a v i g a t e T o ( " S e l e c t P r o c e s s o r " ) ;  
                 } )  
                 . o n ( " c l i c k " ,   " . c - p a y m e n t - f e a t u r e - u p g r a d e " ,   f u n c t i o n   ( )   {  
                         v a r   e l   =   $ ( t h i s ) ;  
                         C o g n i t o . n a v i g a t e ( f u n c t i o n   ( )   {   w i n d o w . l o c a t i o n . h r e f   =   ' / a d m i n / o r g a n i z a t i o n / s e l e c t p l a n ? s o u r c e = t r y i t n o w - f e a t u r e & d e t a i l s = p a y m e n t - '   +   e l . a t t r ( " d a t a - s o u r c e " ) ;   } ) ;  
                 } ) ;  
  
 } ) ;